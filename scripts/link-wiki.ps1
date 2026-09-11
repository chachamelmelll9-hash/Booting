# apps\wiki -> docs 정션을 만든다. Obsidian 은 apps\wiki 를 볼트로 연다.
#
# 왜 정션인가: 위키 본체는 docs/wiki 에 두되(원본 스펙 docs/features 와 같은 볼트 안에 있어야
# 링크가 해석된다), Obsidian 진입점은 apps/wiki 로 두고 싶어서다. git 은 apps/wiki 를 무시한다
# (.gitignore) — 정션을 커밋하면 Windows git 이 내용을 두 번 담는다.
#
# 관리자 권한 불필요. 지우려면:  cmd /c rmdir apps\wiki   (정션만 지워지고 docs 는 그대로다)
[CmdletBinding()]
param([switch]$Remove)

$root = Split-Path -Parent $PSScriptRoot
$link = Join-Path $root 'apps\wiki'
$target = Join-Path $root 'docs'

if ($Remove) {
  if (Test-Path $link) {
    $item = Get-Item $link -Force
    if ($item.LinkType -ne 'Junction') { Write-Error "apps\wiki 가 정션이 아닙니다. 손으로 확인하세요."; exit 1 }
    cmd /c rmdir "$link" | Out-Null
    "지웠습니다: $link"
  } else { "없습니다: $link" }
  exit 0
}

if (Test-Path $link) {
  $item = Get-Item $link -Force
  if ($item.LinkType -eq 'Junction') { "이미 있습니다: $link -> $($item.Target)"; exit 0 }
  Write-Error "apps\wiki 가 이미 있고 정션이 아닙니다. 옮기거나 지운 뒤 다시 실행하세요."
  exit 1
}

New-Item -ItemType Junction -Path $link -Target $target | Out-Null
"만들었습니다: $link -> $target"
"Obsidian: '폴더를 볼트로 열기' -> $link  (시작 페이지: wiki\index.md)"
