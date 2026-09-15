# =============================================================================
# ensure-emulator.ps1 — ADB 검증에 쓸 Android 에뮬레이터를 "확실히" 준비한다.
#
# scripts/ensure-emulator.sh 의 Windows 등가물. 출력 계약은 동일하다:
# 성공 시 마지막 줄에 EMULATOR_READY=<serial>, 실패 시 EMULATOR_FAILED=<사유>
#
# .sh 와 동일하게 흡수하는 결함들:
#   1. 기본 host-GPU 모드에서 `adb screencap` 이 검은 이미지를 주는 경우가 있다
#      → -gpu swiftshader_indirect (소프트웨어 렌더링)로 기동
#   2. 화면이 잠들면(mWakefulness=Asleep) 모든 캡처가 동일한 검은 PNG 가 된다
#      → 부팅 후 wake + keyguard 해제 + screen_off_timeout 연장
#   3. 이전 인스턴스가 AVD 락을 놓기 전에 재기동하면
#      "Running multiple emulators with the same AVD" 로 조용히 실패한다
#      → 종료를 확인한 뒤에만 기동
#   4. 툴 호출이 끝나면 자식 프로세스가 함께 죽는 환경이 있다
#      → Start-Process 로 콘솔에서 분리해 기동
#   5. Metro(8081)에 못 붙으면 dev 빌드는 빈 화면만 뜬다
#      → 부팅 후 adb reverse 로 8081/3000/4200/54321 매핑
#
# Windows 고유 차이:
#   - SDK 기본 경로가 %LOCALAPPDATA%\Android\Sdk (.sh 는 ~/Library/Android/sdk)
#   - qemu 프로세스명이 qemu-system-x86_64.exe (Apple Silicon 의 -aarch64 가 아니다)
#   - setsid/nohup 대신 Start-Process -WindowStyle Hidden
#
# 사용:
#   powershell -ExecutionPolicy Bypass -File scripts/ensure-emulator.ps1
#   ... -Restart          # 강제 재기동
#   ... -Avd NAME         # AVD 지정
#   ... -Gpu host         # 렌더러 변경 (기본 swiftshader_indirect)
# =============================================================================
[CmdletBinding()]
param(
  [switch]$Restart,
  [string]$Avd = '',
  [string]$Gpu = 'swiftshader_indirect',
  # 두 번째 에뮬레이터: -Port 5556 처럼 주면 그 시리얼(emulator-5556)만 다루고,
  # 이미 떠 있는 다른 에뮬레이터는 건드리지 않는다 (발표: 가입용 + 시연용 두 대).
  # 두 대는 메모리를 5GB 넘게 먹으니 발표 때만 띄우고 바로 내린다.
  [int]$Port = 0
)

$ErrorActionPreference = 'Continue'
$ReversePorts = @(8081, 3000, 4200, 54321)
$Serial = if ($Port) { "emulator-$Port" } else { '' }

function Fail($reason) { Write-Output "EMULATOR_FAILED=$reason"; exit 1 }

# --- SDK 위치 확정 ---
$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }

$emu = Join-Path $sdk 'emulator\emulator.exe'
$adb = Join-Path $sdk 'platform-tools\adb.exe'
if (-not (Test-Path $adb)) {
  $onPath = Get-Command adb -ErrorAction SilentlyContinue
  if ($onPath) { $adb = $onPath.Source }
}

if (-not (Test-Path $emu)) { Fail "no-emulator-binary ($emu)" }
if (-not (Test-Path $adb)) { Fail 'no-adb' }

# 에뮬레이터는 non-ASCII 경로를 mojibake 로 망가뜨려 AVD·시스템 이미지를 못 읽는다.
# (한글 사용자명 프로필에서 실측: "?쒗솕?먰빐蹂댄뿕" 로 깨지고 boot-timeout 으로 끝난다)
foreach ($pair in @(@{n='SDK'; v=$sdk}, @{n='ANDROID_AVD_HOME'; v=$env:ANDROID_AVD_HOME})) {
  if ($pair.v -and ($pair.v -match '[^\x00-\x7F]')) {
    Fail "non-ascii-path ($($pair.n)=$($pair.v) — ASCII 경로로 옮기고 환경변수를 갱신할 것)"
  }
}

function Adb { if ($Serial) { & $adb -s $Serial @args 2>$null } else { & $adb @args 2>$null } }

function Test-Booted {
  $v = (Adb shell getprop sys.boot_completed) -join '' -replace '\s', ''
  return ($v -eq '1')
}

function Invoke-WakeUp {
  Adb shell input keyevent KEYCODE_WAKEUP | Out-Null
  Adb shell wm dismiss-keyguard | Out-Null
  Adb shell input keyevent 82 | Out-Null
  Adb shell settings put system screen_off_timeout 1800000 | Out-Null
  Adb shell svc power stayon true | Out-Null
}

function Set-Reverse {
  foreach ($p in $ReversePorts) { Adb reverse "tcp:$p" "tcp:$p" | Out-Null }
}

# 에뮬레이터 창은 항상 y=-659 에 떠서 위쪽이 잘린다 (재시작마다 재발, 두 대면 겹친다).
# 소유자 "아래로 내려달라고 맨날 말하는데" — 띄울 때 창을 화면 안(y=0)으로 옮기고,
# 여러 대면 포트 순서대로 나란히 둔다. 실패해도 기동 자체는 성공으로 본다.
function Move-EmulatorWindows {
  try {
    if (-not ('EmuWin' -as [type])) {
      Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices; using System.Collections.Generic;
public class EmuWin {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h,int x,int y,int w,int ht,bool r);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out R rc);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  public struct R { public int L,T,Rt,B; }
  public static List<string> Titles = new List<string>();
  public static List<IntPtr> Find(string part) { var res = new List<IntPtr>(); Titles.Clear(); EnumWindows((h,l)=>{ var sb=new StringBuilder(256); GetWindowText(h,sb,256); if (sb.ToString().Contains(part)) { res.Add(h); Titles.Add(sb.ToString()); } return true; }, IntPtr.Zero); return res; }
}
"@
    }
    $handles = [EmuWin]::Find('Android Emulator')
    $titles = [EmuWin]::Titles
    $order = @()
    for ($k = 0; $k -lt $handles.Count; $k++) { $order += [pscustomobject]@{ h = $handles[$k]; t = $titles[$k] } }
    $x = 40
    foreach ($w in ($order | Sort-Object t)) {
      $r = New-Object EmuWin+R
      [EmuWin]::GetWindowRect($w.h, [ref]$r) | Out-Null
      $width = $r.Rt - $r.L; $height = $r.B - $r.T
      if ($width -lt 100) { continue }
      [EmuWin]::ShowWindow($w.h, 9) | Out-Null
      # y=120: 0 이면 "조금 더 내려달라" 는 말이 나왔다 (09-15). 제목 표시줄이 잡히는 높이
      [EmuWin]::MoveWindow($w.h, $x, 120, $width, $height, $true) | Out-Null
      Write-Output "window: $($w.t) -> x=$x y=120"
      $x += $width + 30
    }
  } catch { Write-Output "window: move skipped ($($_.Exception.Message))" }
}

function Complete-Ok {
  Invoke-WakeUp
  Set-Reverse
  Move-EmulatorWindows
  $state = ((Adb shell dumpsys power) | Select-String -Pattern 'mWakefulness' | Select-Object -First 1)
  if ($state) { $state = $state.Line.Trim() } else { $state = 'unknown' }
  $serial = if ($Serial) { $Serial } else { ((& $adb devices 2>$null) | Where-Object { $_ -match '\sdevice$' } | Select-Object -First 1) -split '\s+' | Select-Object -First 1 }
  $maps = @(Adb reverse --list).Count
  Write-Output "wakefulness: $state"
  Write-Output "reverse: $maps mappings"
  if (-not $serial) { $serial = 'emulator' }
  Write-Output "EMULATOR_READY=$serial"
  exit 0
}

# --- 이미 준비돼 있으면 재사용 ---
if (-not $Restart -and (Test-Booted)) {
  Write-Output 'reusing running emulator'
  Complete-Ok
}

# --- 기존 인스턴스 종료 + 락 해제 대기 (결함 3) ---
# -Port 지정 시에는 다른 에뮬레이터를 죽이지 않는다 — 그 시리얼이 안 떠 있다는 것만 확인됐다.
if (-not $Serial) {
  if ((Adb devices) -match '\sdevice$') {
    Write-Output 'stopping existing emulator...'
    Adb emu kill | Out-Null
  }
  # 프로세스 "이름"으로만 매칭한다. 명령줄 전체를 매칭하면 같은 문자열을 담은
  # 셸(예: 이 스크립트를 호출한 에이전트의 셸)까지 잡혀 엉뚱한 프로세스를 죽인다.
  function Test-EmuRunning {
    return [bool](Get-Process -Name 'qemu-system-x86_64', 'qemu-system-aarch64' -ErrorAction SilentlyContinue)
  }
  for ($i = 0; $i -lt 20; $i++) {
    if (-not (Test-EmuRunning)) { break }
    Start-Sleep -Seconds 1
  }
  if (Test-EmuRunning) {
    Get-Process -Name 'qemu-system-x86_64', 'qemu-system-aarch64' -ErrorAction SilentlyContinue |
      Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
  }
}

# --- AVD 선택 ---
if (-not $Avd) { $Avd = (& $emu -list-avds 2>$null | Where-Object { $_.Trim() } | Select-Object -First 1) }
if (-not $Avd) { Fail 'no-avd (avdmanager 또는 Android Studio > Device Manager 에서 AVD 생성 필요)' }
$Avd = $Avd.Trim()
Write-Output "avd: $Avd"

# --- 기동 (결함 1, 4) ---
$log = Join-Path 'C:\Android' "ensure-emulator-$PID.log"
$emuArgs = @('-avd', $Avd, '-gpu', $Gpu, '-no-boot-anim', '-no-snapshot-load', '-no-audio')
if ($Port) { $emuArgs += @('-port', "$Port") }
# cmd 로 감싸 리다이렉트하고 Win32_Process.Create 로 띄운다. Start-Process 로 만든
# 자식은 에이전트 툴 호출이 끝날 때 job object 와 함께 죽는 환경이 있다 (결함 4).
$cmdLine = 'cmd.exe /c ""{0}" {1} > "{2}" 2>&1"' -f $emu, ($emuArgs -join ' '), $log
$spawned = $false
try {
  $r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmdLine }
  if ($r.ReturnValue -eq 0) { $spawned = $true }
} catch { }
if (-not $spawned) {
  Start-Process -FilePath $emu -ArgumentList $emuArgs -RedirectStandardOutput $log -WindowStyle Hidden | Out-Null
}
Write-Output "launching (gpu=$Gpu), log: $log"

# --- 부팅 대기 (소프트웨어 렌더링은 느리다) ---
for ($i = 1; $i -le 60; $i++) {
  Start-Sleep -Seconds 5
  if (Test-Booted) {
    Write-Output "booted after $($i * 5)s"
    Start-Sleep -Seconds 3
    Complete-Ok
  }
  if ($i -eq 6 -and -not $Serial -and -not ((Adb devices) -match '\sdevice$')) {
    Adb kill-server | Out-Null
    Adb start-server | Out-Null
  }
  foreach ($f in @($log, "$log.err")) {
    if ((Test-Path $f) -and (Select-String -Path $f -Pattern 'Running multiple emulators with the same AVD' -Quiet)) {
      Fail 'avd-locked (이전 인스턴스가 아직 락을 쥐고 있다 — -Restart 로 재시도)'
    }
  }
}

Write-Output '--- launch log tail ---'
foreach ($f in @($log, "$log.err")) {
  if (Test-Path $f) { Get-Content $f -Tail 15 }
}
Fail 'boot-timeout (300s)'
