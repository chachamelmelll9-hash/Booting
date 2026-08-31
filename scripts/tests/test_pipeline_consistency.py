#!/usr/bin/env python3
"""파이프라인 정합성 감사 — phase <-> skill <-> agent 참조가 전부 실재하는가.

`disable-model-invocation` 이 파이프라인 스킬에 다시 들어오는 것도 여기서 막는다
(실측 결함: 그 플래그 때문에 auto mode 가 implement 단계에서 사망했다).

실행: python3 scripts/tests/test_pipeline_consistency.py   (저장소 루트에서)
"""
import sys, re, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
import os
os.chdir(ROOT)
sys.path.insert(0, str(ROOT / '.codex' / 'hooks'))
from lib.common import PIPELINE_PHASES, PHASE_TO_SKILL, BUILD_SUBPHASE_SKILLS, RELEASE_GATED_PHASES

fails=[]
def chk(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ")+name+((" :: "+extra) if extra and not ok else ""))
    if not ok: fails.append(name)

skills_dir=ROOT/'.claude/skills'; agents_dir=ROOT/'.claude/agents'
have_skills={p.name for p in skills_dir.iterdir() if (p/'SKILL.md').exists()}
have_agents={p.stem for p in agents_dir.glob('*.md')}

# 1) 모든 phase 에 스킬이 매핑되고 파일이 실재하는가
for ph in PIPELINE_PHASES:
    if ph=='build':
        for sk in BUILD_SUBPHASE_SKILLS:
            chk(f"build subphase 스킬 존재: {sk}", sk in have_skills)
        continue
    sk=PHASE_TO_SKILL.get(ph)
    chk(f"phase '{ph}' -> 스킬 매핑", sk is not None, str(PHASE_TO_SKILL))
    if sk: chk(f"phase '{ph}' 스킬 파일 존재: {sk}", sk in have_skills, sorted(have_skills))

# 2) 스킬 frontmatter 무결성 + disable-model-invocation 없음
for sk in sorted(have_skills):
    txt=(skills_dir/sk/'SKILL.md').read_text()
    fm=txt.split('---')[1] if txt.startswith('---') else ''
    chk(f"{sk}: name 필드", re.search(r'^name:\s*'+re.escape(sk)+r'\s*$', fm, re.M) is not None, fm[:200])
    chk(f"{sk}: disable-model-invocation 없음", 'disable-model-invocation' not in fm)

# 3) 스킬이 참조하는 Skill(x) 가 전부 실재하는가
for sk in sorted(have_skills):
    fm=(skills_dir/sk/'SKILL.md').read_text().split('---')[1]
    for ref in re.findall(r'Skill\(([a-z0-9-]+)\)', fm):
        chk(f"{sk}: allowed-tools 의 Skill({ref}) 실재", ref in have_skills, sorted(have_skills))

# 4) 스킬이 spawn 하는 subagent_type 이 실재하는가
for sk in sorted(have_skills):
    body=(skills_dir/sk/'SKILL.md').read_text()
    for ref in set(re.findall(r'subagent_type:\s*"([a-z0-9-]+)"', body)):
        chk(f"{sk}: subagent_type '{ref}' 실재", ref in have_agents, sorted(have_agents))

# 4-b) 스킬/에이전트가 참조하는 "템플릿에 원래 있어야 할" 경로가 실재하는가.
#      파이프라인이 스스로 만드는 산출물(docs/features, docs/progress, .env, 키스토어 등)은 제외한다.
GENERATED_PREFIXES = ('docs/features/', 'docs/progress/', 'docs/store-', 'docs/release-',
                      'docs/app-privacy', 'infra/oracle/.deploy-state', 'assets/screenshots/',
                      # expo prebuild 생성물 (gitignore 대상)
                      'apps/mobile/android/', 'apps/mobile/ios/', 'test-results/')
GENERATED_SUFFIXES = ('.env', '.env.development', '.env.production', 'keystore.properties',
                      'google-services.json', '.last-build-number')
GENERATED_CONTAINS = ('/pages/landing/',)
path_re = re.compile(r'`((?:scripts|docs|apps|infra|packages|supabase|\.claude|\.codex|\.github)/[A-Za-z0-9._/-]+)`')
for f in sorted(list(skills_dir.glob('*/SKILL.md')) + list(agents_dir.glob('*.md'))):
    for ref in sorted(set(path_re.findall(f.read_text()))):
        if ref.startswith(GENERATED_PREFIXES) or ref.endswith(GENERATED_SUFFIXES): continue
        if any(c in ref for c in GENERATED_CONTAINS): continue
        chk(f"{f.relative_to(ROOT)}: 참조 경로 실재 {ref}", (ROOT/ref).exists(), "템플릿에 없음")

# 4-c) 서버 헬스체크가 루트(/)를 치지 않는가.
#      NestJS 라우트는 `/api` prefix 아래에만 매핑되므로 루트는 정상일 때도 404다.
#      루트로 `curl -sf` 를 걸면 항상 실패해 setup 이 첫 phase 에서 파이프라인을 죽인다 (실측 결함).
bad_health = re.compile(r'curl[^\n]*-[a-zA-Z]*f[a-zA-Z]*\s+https?://(?:localhost|127\.0\.0\.1|10\.0\.2\.2):3000(?![/\w])')
for f in sorted(list(skills_dir.glob('*/SKILL.md')) + list(agents_dir.glob('*.md'))):
    hits = bad_health.findall(f.read_text())
    chk(f"{f.relative_to(ROOT)}: 서버 헬스체크가 루트를 치지 않음", not hits, str(hits))

# 4-d) 에뮬레이터를 직접 띄우지 않는가.
#      Apple Silicon 기본 GPU 모드로 띄우면 screencap 이 검은 이미지가 되어
#      스모크 증거와 스토어 스크린샷이 통째로 무의미해진다 (실측: 10,195바이트 동일 PNG).
#      준비는 scripts/ensure-emulator.sh 로 단일화한다.
raw_emu = re.compile(r'(?<!ensure-)emulator\s+-avd\s')
for f in sorted(list(skills_dir.glob('*/SKILL.md')) + list(agents_dir.glob('*.md'))):
    hits = raw_emu.findall(f.read_text())
    chk(f"{f.relative_to(ROOT)}: 에뮬레이터를 직접 기동하지 않음", not hits, str(hits))

# 4-e) 문서의 phase 목록이 정본(common.py 의 PIPELINE_PHASES)과 어긋나지 않는가.
#      스킬 문서만 고치고 라우터를 안 고치면 (또는 반대면) 둘이 조용히 갈라진다.
schema = (ROOT / 'docs/progress/SCHEMA.md').read_text()
for ph in PIPELINE_PHASES:
    chk(f"SCHEMA.md 가 phase '{ph}' 를 문서화", f"`{ph}`" in schema, "SCHEMA.md phase 목록 확인")
for doc in ['CLAUDE.md', 'README.md']:
    t = (ROOT / doc).read_text()
    chk(f"{doc} 가 verify phase 를 언급", 'verify' in t, "verify phase 문서화 누락")

# 4-f) 서브에이전트가 답신 대상을 하드코딩하지 않는가.
#      실측: ux-ui-designer / clarifying-plan-agent 가 "team-lead" 로 고정 답신하고 있었는데
#      실제 호출자 이름은 달라서 리뷰·답변이 통째로 유실됐다. 호출한 phase 는 응답을 기다리다
#      정체 감지 직전까지 갔고, runner-log 에는 "clarifier 에이전트 무응답" 으로 기록됐다.
hardcoded_to = re.compile(r'SendMessage\s+to\s+"team-lead"|to:\s*"team-lead"')
for f in sorted(agents_dir.glob('*.md')):
    body = f.read_text()
    # 결함을 설명하는 주석 줄은 제외하고 검사한다
    lines = [ln for ln in body.splitlines() if '실측 결함' not in ln and not ln.strip().startswith('>')]
    hits = hardcoded_to.findall("\n".join(lines))
    chk(f"{f.relative_to(ROOT)}: 답신 대상을 하드코딩하지 않음", not hits, str(hits))

# 5) release gating 이 실제로 verify 를 보호하는가
chk("verify 는 release-gated 가 아니다", 'verify' not in RELEASE_GATED_PHASES)
chk("verify 가 deploy 보다 앞", PIPELINE_PHASES.index('verify')<PIPELINE_PHASES.index('deploy'))
chk("deploy/build/launch 가 release-gated", RELEASE_GATED_PHASES=={'deploy','build','launch'})

print(); print("FAILED:", fails if fails else "none")

# 8) 토큰 예산 규약 — run4 실측(워커 하나가 46%) 에서 유래. 스펙과 훅·스크립트가 서로를 가리키는지 본다.
orch=(agents_dir/'implement-orchestrator.md').read_text()
chk("orchestrator: 토큰 예산 규약 섹션", '## 토큰 예산 규약' in orch)
chk("orchestrator: spawn budget 60", 'budget: 60 tool calls' in orch)
chk("orchestrator: mobile 탭 slice", 'slice `foundation`' in orch or "slice `foundation`" in orch)
chk("orchestrator: 리뷰어 2개 순차·추가 리뷰어 금지", 'quality-reviewer' in orch and '순차 실행' in orch)
chk("orchestrator: RATE_LIMIT_PAUSE 처리", 'RATE_LIMIT_PAUSE' in orch)
for w in ['mobile-implement','server-implement','db-implement','webview-implement','e2e-verify','adb-verify']:
    chk(f"{w}: Spawn Budget & Checkpoint 섹션", '## Spawn Budget & Checkpoint' in (agents_dir/f'{w}.md').read_text())
settings=json.loads((ROOT/'.claude/settings.json').read_text())
pre=settings.get('hooks',{}).get('PreToolUse',[])
chk("settings: PreToolUse Agent 게이트 등록", any(h.get('matcher')=='Agent' and any('pre_tool_rate_gate.py' in x.get('command','') for x in h.get('hooks',[])) for h in pre))
chk("훅 파일 존재: pre_tool_rate_gate.py", (ROOT/'.claude/hooks/pre_tool_rate_gate.py').exists())
chk("공용 lib: ratelimit.py", (ROOT/'.codex/hooks/lib/ratelimit.py').exists())
chk("supervisor: scripts/run-auto.sh", (ROOT/'scripts/run-auto.sh').exists())
chk("supervisor: bash -n", __import__('subprocess').run(['bash','-n','scripts/run-auto.sh']).returncode==0)
chk("모니터: scripts/lib/rate_limit_monitor.py", (ROOT/'scripts/lib/rate_limit_monitor.py').exists())
chk("CLAUDE.md: run-auto.sh 안내", 'scripts/run-auto.sh' in (ROOT/'CLAUDE.md').read_text())

# 9) 컨텍스트 위생·supervisor 모드 정합성
chk("orchestrator: 컨텍스트 위생 규칙", '규칙 6 — 컨텍스트 위생' in orch and '규칙 7' in orch)
chk("orchestrator: 스펙 전체 읽기 지시 제거", '5개 이상의 스펙 문서를 모두 읽고' not in orch)
for w in ['mobile-implement','server-implement','db-implement','webview-implement','e2e-verify','adb-verify']:
    chk(f"{w}: 일괄 cat 금지 규칙", '디렉토리 일괄 `cat`' in (agents_dir/f'{w}.md').read_text())
chk("mobile-implement: 전체 스펙 읽기 지시 제거", '1. 모든 스펙 문서 읽기' not in (agents_dir/'mobile-implement.md').read_text())
chk("CLAUDE.md: supervisor 모드 계약", 'supervisor 모드' in (ROOT/'CLAUDE.md').read_text())
for sk in ['setup','start','continue','clarify-core-feature','define-pages','design-wireframes','design-architecture','write-test-scenarios','implement-feature']:
    chk(f"{sk}: supervisor 모드 체이닝 예외", 'supervisor 모드' in (skills_dir/sk/'SKILL.md').read_text())
chk("gitignore: supervisor.json", 'docs/progress/supervisor.json' in (ROOT/'.gitignore').read_text())

# 10) ux-ui-designer 토큰 예산 — 모드별 레퍼런스, 저장소 탐색 금지, 단발 리뷰 (run4: tool_result 238KB 중 ~80% 가 미요청 탐색)
ux=(agents_dir/'ux-ui-designer.md').read_text()
chk("ux-ui-designer: Glob/Grep 제거 (탐색 금지)", re.search(r'^tools:.*\b(Glob|Grep)\b', ux, re.M) is None)
chk("ux-ui-designer: 모드별 레퍼런스 표", '| `page-structure` |' in ux and '| `wireframe` |' in ux and '| `component-architecture` |' in ux)
chk("ux-ui-designer: 전체 레퍼런스 일괄 읽기 지시 제거", 'Read the design intelligence references' not in ux)
chk("ux-ui-designer: 단발 리뷰(반환값) 프로토콜", 'stateless 단발 리뷰' in ux)
chk("ux-ui-designer: 준비 알림(ack) 제거", 'readiness acknowledgment' not in ux)
for sk in ['define-pages','design-wireframes','design-architecture']:
    body=(skills_dir/sk/'SKILL.md').read_text()
    chk(f"{sk}: ux-ui-designer 단발 spawn(run_in_background)", 'subagent_type: "ux-ui-designer", run_in_background: true' in body)
    chk(f"{sk}: shutdown_request 제거", 'shutdown_request' not in body)

sys.exit(1 if fails else 0)
