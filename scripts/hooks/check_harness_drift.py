#!/usr/bin/env python3
"""check_harness_drift.py — CLAUDE.md 의 하네스 카운트 표기 vs 실측 drift 검증.

회귀 가드 hook #22 (Phase 4, 2026-05-24).
사고 원형: 2026-05-24 갭 분석에서 CLAUDE.md L125 "18 hook" 표기와
실제 .pre-commit-config.yaml 의 20 hook 사이 drift 2건 발견.
본 hook 은 동일 drift 재발을 차단.

검증 항목:
1. "N hook" 표기 vs `.pre-commit-config.yaml` 의 `id:` 카운트
2. "N rules/" 표기 vs `ls rules/*.md` 카운트 (옵션, 명시 표기 있을 때만)
3. "N skill" 표기 vs `ls .claude/skills/` 카운트 (옵션)

사용:
    python3 scripts/hooks/check_harness_drift.py
    exit 0 = clean, exit 1 = drift found
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CLAUDE_MD = REPO_ROOT / "CLAUDE.md"
PRECOMMIT = REPO_ROOT / ".pre-commit-config.yaml"
RULES_DIR = REPO_ROOT / "rules"
SKILLS_DIR = REPO_ROOT / ".claude" / "skills"


def count_precommit_hooks() -> int:
    if not PRECOMMIT.exists():
        return 0
    return sum(1 for line in PRECOMMIT.read_text().splitlines() if re.match(r"^\s*-\s+id:", line))


def count_rules_md() -> int:
    if not RULES_DIR.exists():
        return 0
    return sum(1 for p in RULES_DIR.glob("*.md") if p.is_file())


def count_skills() -> int:
    if not SKILLS_DIR.exists():
        return 0
    return sum(1 for p in SKILLS_DIR.iterdir() if p.is_dir())


def check_claude_md() -> list[str]:
    """Return list of drift messages. Empty list = clean.
    CLAUDE.md 없으면 graceful skip (deploy target 등 일부 프로젝트는 CLAUDE.md 미사용)."""
    if not CLAUDE_MD.exists():
        return []  # graceful — CLAUDE.md 미사용 프로젝트는 drift 검사 skip

    text = CLAUDE_MD.read_text()
    drifts: list[str] = []

    actual_hooks = count_precommit_hooks()
    actual_rules = count_rules_md()
    actual_skills = count_skills()

    # 검증 1: "N hook" 표기 (필수 — CLAUDE.md 운영 가드 명시)
    hook_match = re.search(r"\bpre-commit\s+\*\*(\d+)\s*hook\*\*", text)
    if hook_match:
        stated = int(hook_match.group(1))
        if stated != actual_hooks:
            drifts.append(
                f"hook drift: CLAUDE.md 표기 '{stated} hook' vs 실측 {actual_hooks} hook (.pre-commit-config.yaml id: 카운트)"
            )

    # 검증 2: "N개 rules/" 또는 "N rules/" (옵션)
    rules_match = re.search(r"\b(\d+)\s*(?:개\s*)?rules/", text)
    if rules_match:
        stated = int(rules_match.group(1))
        # CLAUDE.md 의 "rules/" 자체 인용 (파일명 부분) 은 매우 흔하므로
        # 숫자가 실측과 ±5 이내가 아니면 drift 로 간주
        if abs(stated - actual_rules) > 5 and stated < 100:
            drifts.append(f"rules drift (확인 필요): CLAUDE.md 표기 '{stated} rules/' vs 실측 {actual_rules} 파일")

    # 검증 3: "N skill" 표기 (옵션)
    skills_match = re.search(r"\b(\d+)\s*skill\b", text, re.IGNORECASE)
    if skills_match:
        stated = int(skills_match.group(1))
        if abs(stated - actual_skills) > 3:
            drifts.append(f"skills drift (확인 필요): CLAUDE.md 표기 '{stated} skill' vs 실측 {actual_skills} 디렉토리")

    return drifts


def main() -> int:
    drifts = check_claude_md()
    print("📊 Harness Drift Check (2026-05-24 Phase 4)")
    print(f"  실측: hook={count_precommit_hooks()} / rules/={count_rules_md()} / skills/={count_skills()}")

    if not drifts:
        print("✅ CLAUDE.md 하네스 카운트 표기 = 실측 일치")
        return 0

    print(f"❌ {len(drifts)} drift(s):")
    for d in drifts:
        print(f"  - {d}")
    print()
    print("  수정: CLAUDE.md 의 해당 표기를 실측값으로 갱신")
    return 1


if __name__ == "__main__":
    sys.exit(main())
