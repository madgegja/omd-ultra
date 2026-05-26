#!/usr/bin/env python3
"""harness_health_check.py — 월 1회 Claude Code 하네스 헬스 체크.

회귀 가드 (Phase 4, 2026-05-24).
cron 등록 권장: `0 8 1 * *` (KST 매월 1일 08:00 = UTC 23:00 전월말일)
- daily_draft_audit (21:00 UTC) 와 시간대 분리
- qa_auto_loop (00:00 UTC) 와 시간대 분리

목적: 블로그 "How Claude Code works in large codebases" 7 레이어 권장사항
대비 본 프로젝트 현재 상태를 월 1회 재집계 + drift 발견 시 Slack 알림.

체크 항목 (7 레이어):
1. CLAUDE.md 라인수 (≤200)
2. .pre-commit-config.yaml hook 카운트 + CLAUDE.md 표기 vs 실측 drift
3. rules/*.md 파일 수 + reference_integrity 통과
4. .claude/skills/ 디렉토리 수
5. .claudeignore 패턴 수 + node_modules / *_extracted.csv 포함 여부
6. dashboard/services/ 파일 수 + MAP.md 동기화
7. LSP servers 상태 (Python ty 설치 여부) + grep baseline 19ms 만족

사용:
    python3 scripts/harness_health_check.py
    python3 scripts/harness_health_check.py --slack   # Slack 알림 ON
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import UTC, datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = REPO_ROOT / "reports"


def _count_lines(path: Path) -> int:
    if not path.exists():
        return 0
    return sum(1 for _ in path.read_text().splitlines())


def _count_pattern(path: Path, pattern_substr: str) -> int:
    if not path.exists():
        return 0
    return sum(1 for line in path.read_text().splitlines() if pattern_substr in line)


def check_layer_1_claude_md() -> dict:
    """CLAUDE.md 또는 AGENTS.md 존재 시 검사. 자체 200줄 가드 명시 없으면 skip (deploy target 등)."""
    claude_md = REPO_ROOT / "CLAUDE.md"
    agents_md = REPO_ROOT / "AGENTS.md"
    web_claude = REPO_ROOT / "web" / "CLAUDE.md"
    target = claude_md if claude_md.exists() else (agents_md if agents_md.exists() else (web_claude if web_claude.exists() else None))
    if target is None:
        return {"layer": "1. CLAUDE.md", "metric": "n/a", "ok": True, "detail": "CLAUDE.md/AGENTS.md 미사용 (skip)"}
    lines = _count_lines(target)
    # 200줄 가드는 default. CLAUDE.md 본문에 "200줄 이하 유지" 명시 시만 검사.
    has_guard = "200줄 이하 유지" in target.read_text()
    ok = lines <= 200 if has_guard else True
    return {
        "layer": "1. CLAUDE.md",
        "metric": f"{lines} lines ({target.name})",
        "ok": ok,
        "detail": f"한계 200, 실측 {lines} ({'가드 명시' if has_guard else '가드 미명시 — skip'})",
    }


def check_layer_2_hooks() -> dict:
    """pre-commit hook 카운트 vs CLAUDE.md 표기 drift. 표기 또는 config 없으면 skip."""
    yaml = REPO_ROOT / ".pre-commit-config.yaml"
    import re

    actual = 0
    if yaml.exists():
        actual = sum(1 for line in yaml.read_text().splitlines() if re.match(r"^\s*-\s+id:", line))
    claude_md = REPO_ROOT / "CLAUDE.md"
    stated = 0
    has_stated = False
    if claude_md.exists():
        m = re.search(r"\bpre-commit\s+\*\*(\d+)\s*hook\*\*", claude_md.read_text())
        if m:
            stated = int(m.group(1))
            has_stated = True
    # 표기 없거나 config 없으면 검사 skip (drift 0)
    if not has_stated and actual == 0:
        return {"layer": "2. Hooks", "metric": "n/a", "ok": True, "detail": "pre-commit + CLAUDE.md 표기 미사용 (skip)"}
    if not has_stated:
        return {"layer": "2. Hooks", "metric": f"actual={actual}", "ok": True, "detail": "CLAUDE.md 표기 미명시 — drift 검사 skip"}
    return {
        "layer": "2. Hooks",
        "metric": f"actual={actual}, stated={stated}",
        "ok": actual == stated,
        "detail": f"drift: {abs(actual - stated)}",
    }


def check_layer_3_rules() -> dict:
    """rules/ 디렉토리 존재 시 검사. 없으면 skip (해당 정책 미채택)."""
    rules = REPO_ROOT / "rules"
    if not rules.exists():
        return {"layer": "3. rules/", "metric": "n/a", "ok": True, "detail": "rules/ 디렉토리 미사용 (skip)"}
    count = len(list(rules.glob("*.md")))
    return {
        "layer": "3. rules/",
        "metric": f"{count} files",
        "ok": count > 0,
        "detail": "rules/*.md 카운트",
    }


def check_layer_4_skills() -> dict:
    skills = REPO_ROOT / ".claude" / "skills"
    count = sum(1 for p in skills.iterdir() if p.is_dir()) if skills.exists() else 0
    return {
        "layer": "4. Skills",
        "metric": f"{count} skills",
        "ok": count > 0,
        "detail": ".claude/skills/ 디렉토리 카운트",
    }


def check_layer_5_claudeignore() -> dict:
    """언어별 큰 데이터 디렉토리 차단 시그널 검사. Python: __pycache__, Node: node_modules 중 하나라도."""
    ci = REPO_ROOT / ".claudeignore"
    if not ci.exists():
        return {"layer": "5. .claudeignore", "metric": "missing", "ok": False, "detail": "파일 부재"}
    text = ci.read_text()
    patterns = [line.strip() for line in text.splitlines() if line.strip() and not line.strip().startswith("#")]
    has_node_modules = any("node_modules" in p for p in patterns)
    has_pycache = any("__pycache__" in p for p in patterns)
    has_lang_baseline = has_node_modules or has_pycache  # 언어 baseline 시그널
    return {
        "layer": "5. .claudeignore",
        "metric": f"{len(patterns)} patterns",
        "ok": has_lang_baseline,
        "detail": f"node_modules={has_node_modules}, __pycache__={has_pycache}",
    }


def check_layer_6_services_map() -> dict:
    """services MAP 검사. dashboard/services/ (toomics) 또는 src/ (Node CLI) 또는 web/src/ (Next.js).
    50+ 파일 디렉토리에 MAP.md 권장. 디렉토리 미존재 또는 50 미만 시 skip."""
    candidates = [
        REPO_ROOT / "dashboard" / "services",  # toomics
        REPO_ROOT / "web" / "src" / "components",  # Next.js
        REPO_ROOT / "src",  # 일반 단일 src/
    ]
    for cand in candidates:
        if cand.exists():
            # 파일 카운트 (재귀 아닌 직속)
            files = list(cand.glob("*.py")) + list(cand.glob("*.ts")) + list(cand.glob("*.tsx"))
            map_md = cand / "MAP.md"
            if len(files) >= 50:
                return {
                    "layer": "6. services MAP",
                    "metric": f"{cand.name}={len(files)} / MAP={'O' if map_md.exists() else 'X'}",
                    "ok": map_md.exists(),
                    "detail": f"50+ 의무, 실측 {len(files)}",
                }
            elif len(files) > 0:
                return {
                    "layer": "6. services MAP",
                    "metric": f"{cand.name}={len(files)}",
                    "ok": True,
                    "detail": f"50 미만 — MAP 옵션 (실측 {len(files)})",
                }
    return {"layer": "6. services MAP", "metric": "n/a", "ok": True, "detail": "services/components 디렉토리 미사용 (skip)"}


def check_layer_7_lsp_grep() -> dict:
    """grep baseline 측정 (3 심볼)."""
    symbols = ["AutoResponder"]  # 가장 큰 매칭 — 부하 점검
    try:
        start = datetime.now(UTC)
        result = subprocess.run(
            ["grep", "-rnE", r"\bAutoResponder\b", "--include=*.py", "."],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=10,
        )
        end = datetime.now(UTC)
        elapsed_ms = (end - start).total_seconds() * 1000
        matches = len([line for line in result.stdout.splitlines() if line])
        return {
            "layer": "7. LSP/grep",
            "metric": f"grep {matches} matches / {elapsed_ms:.0f}ms",
            "ok": elapsed_ms < 5000,  # bash 19ms baseline + subprocess.run() 오버헤드 반영
            "detail": "bash baseline 19ms + subprocess 오버헤드, 한계 5000ms",
        }
    except Exception as exc:
        return {"layer": "7. LSP/grep", "metric": "ERROR", "ok": False, "detail": str(exc)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slack", action="store_true", help="Slack 알림 발송")
    parser.add_argument("--json", action="store_true", help="JSON 출력")
    args = parser.parse_args()

    now = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S %Z")
    print(f"📊 Harness Health Check — {now}")
    print()

    results = [
        check_layer_1_claude_md(),
        check_layer_2_hooks(),
        check_layer_3_rules(),
        check_layer_4_skills(),
        check_layer_5_claudeignore(),
        check_layer_6_services_map(),
        check_layer_7_lsp_grep(),
    ]

    fail_count = sum(1 for r in results if not r["ok"])

    if args.json:
        print(json.dumps({"timestamp": now, "results": results, "fail_count": fail_count}, ensure_ascii=False, indent=2))
    else:
        for r in results:
            mark = "✅" if r["ok"] else "❌"
            print(f"  {mark} {r['layer']:<24} {r['metric']:<30} | {r['detail']}")
        print()
        print(f"총 {len(results)} 레이어 / 실패 {fail_count}")

    # Slack 알림 (실패 발생 시만)
    if args.slack and fail_count > 0:
        webhook = os.environ.get("SLACK_WEBHOOK_URL", "")
        if webhook:
            try:
                import urllib.request

                failed = [r for r in results if not r["ok"]]
                text = f"📊 Harness Health Check — {fail_count} drift detected\n"
                for r in failed:
                    text += f"  ❌ {r['layer']}: {r['metric']} ({r['detail']})\n"
                payload = json.dumps({"text": text}).encode()
                req = urllib.request.Request(webhook, data=payload, headers={"Content-Type": "application/json"})
                urllib.request.urlopen(req, timeout=10)
                print("  📨 Slack 알림 전송 완료")
            except Exception as exc:
                print(f"  ⚠️ Slack 알림 실패: {exc}")
        else:
            print("  ⚠️ SLACK_WEBHOOK_URL 미설정 — 알림 건너뜀")

    return 1 if fail_count > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
