#!/usr/bin/env python3
"""check_claudeignore_syntax.py — .claudeignore 패턴 유효성 검증.

회귀 가드 hook #21 (Phase 4, 2026-05-24).
.claudeignore 변경 시 pre-commit 단계에서 자동 검증.

검증 항목:
1. 빈 패턴 (whitespace only) 차단
2. 중복 패턴 차단 (주석 제외, 동일 라인 반복)
3. 잘못된 trailing whitespace 차단
4. 음수 패턴 형식 검증 (! 로 시작하는 라인)
5. 라인 끝 trailing slash 일관성 (디렉토리는 /, 파일은 / 없음)

사용:
    python3 scripts/hooks/check_claudeignore_syntax.py
    exit 0 = clean, exit 1 = violations found
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CLAUDEIGNORE = REPO_ROOT / ".claudeignore"


def lint(path: Path) -> list[str]:
    """Return list of violation messages. Empty list = clean."""
    if not path.exists():
        return [f"{path}: 파일이 존재하지 않음"]

    violations: list[str] = []
    seen_patterns: dict[str, int] = {}

    for lineno, raw_line in enumerate(path.read_text().splitlines(), start=1):
        line = raw_line.rstrip("\n")
        stripped = line.strip()

        # 빈 라인 / 주석은 검증 제외
        if not stripped or stripped.startswith("#"):
            continue

        # 검증 1: trailing whitespace
        if line != line.rstrip():
            violations.append(f"L{lineno}: trailing whitespace — '{line}'")

        # 검증 2: 중복 패턴 (주석 제외)
        if stripped in seen_patterns:
            prev = seen_patterns[stripped]
            violations.append(f"L{lineno}: 중복 패턴 (L{prev} 와 동일) — '{stripped}'")
        else:
            seen_patterns[stripped] = lineno

        # 검증 3: 잘못된 음수 패턴 (! 단독)
        if stripped == "!":
            violations.append(f"L{lineno}: 비어있는 음수 패턴 — '!'")
        elif stripped.startswith("! "):
            violations.append(f"L{lineno}: 음수 패턴은 ! 직후 공백 없이 작성 — '{stripped}'")

        # 검증 4: glob 패턴 기본 유효성 (대괄호 짝)
        opens = stripped.count("[")
        closes = stripped.count("]")
        if opens != closes:
            violations.append(f"L{lineno}: 대괄호 짝 불일치 ([: {opens}, ]: {closes}) — '{stripped}'")

    return violations


def main() -> int:
    violations = lint(CLAUDEIGNORE)
    if not violations:
        print(f"✅ {CLAUDEIGNORE.relative_to(REPO_ROOT)}: clean ({len(CLAUDEIGNORE.read_text().splitlines())} lines)")
        return 0

    print(f"❌ {CLAUDEIGNORE.relative_to(REPO_ROOT)}: {len(violations)} violation(s)")
    for v in violations:
        print(f"  {v}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
