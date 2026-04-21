<h1 align="center">omd-ultra</h1>

<p align="center">
  <strong>OmD + shadcn/ui + Radix UI — 확장된 DESIGN.md 생성기</strong><br/>
  브랜드 컨텍스트부터 접근성 갖춘 컴포넌트 코드까지 한 번에.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/AI%20calls-zero-blue?style=flat-square" alt="Zero AI" />
  <img src="https://img.shields.io/badge/references-67%2B-7c5cfc?style=flat-square" alt="References" />
  <img src="https://img.shields.io/badge/scaffold-shadcn%20%2B%20radix-0ea5e9?style=flat-square" alt="Scaffold" />
</p>

---

## 이게 뭔가요?

**omd-ultra**는 [oh-my-design (OmD)](https://github.com/kwakseongjae/oh-my-design)의 확장 포크입니다.
OmD가 제공하는 **브랜드 철학이 담긴 `DESIGN.md`** 위에, 그 브랜드 토큰을 실제 코드로 찍어내는
**shadcn/ui 컴포넌트 스캐폴딩 + Radix UI 접근성 래핑** 레이어를 얹었습니다.

```
DESIGN.md (브랜드 철학)      ──┐
  + shadcn/ui 컴포넌트 매핑  ──┼──>  브랜드화된 실코드 번들
  + Radix 접근성 프리미티브  ──┘
```

## 세 가지 레이어

1. **OmD v0.1 베이스** (상속)
   - 67+ 실제 기업 `DESIGN.md` 레퍼런스 (Toss, Claude, Stripe, Linear, Vercel, Airbnb, Apple, ...)
   - Philosophy Layer: Voice · Narrative · Principles · Personas · States · Motion
   - Google Stitch 호환 섹션 1~9 + OmD 섹션 10~15

2. **shadcn/ui 스캐폴딩** (추가)
   - `DESIGN.md`의 토큰(색·타이포·radius·motion)을 shadcn 컴포넌트에 자동 주입
   - 테마 CSS + 컴포넌트 소스 한 번에 export

3. **Radix UI 접근성** (추가)
   - 상호작용 프리미티브(Dialog, Popover, Select 등)를 Radix 기반으로 래핑
   - WAI-ARIA 패턴·키보드 네비게이션·포커스 트랩 기본 장착

## 빠른 시작

```bash
npm install
npm run build
npm start                     # 인터랙티브 위자드
npx omd-ultra scaffold         # DESIGN.md → shadcn/Radix 코드 번들 생성
```

## 프로젝트 구조

```
omd-ultra/
  spec/
    omd-v0.1.md              # OmD 원본 스펙 (상속)
    omd-ultra-v0.1.md        # 확장 스펙 (NEW)
  references/                # 67+ 브랜드 DESIGN.md
  src/
    cli/                     # 위자드
    core/                    # 파서·커스터마이저·렌더러·프리뷰
    scaffold/                # shadcn/Radix 생성기 (NEW)
    templates/
  web/                       # Next.js 빌더
  docs/upstream/             # 업스트림 README 보관
  NOTICE.md                  # 귀속 명세
```

## 테스트

```bash
npm test                     # CLI 테스트 (unit + references smoke)
cd web && npm test           # Web 테스트
```

## 라이선스 및 귀속

MIT. 이 프로젝트는 [kwakseongjae/oh-my-design](https://github.com/kwakseongjae/oh-my-design)의 파생 저작물입니다.
상세는 [`NOTICE.md`](NOTICE.md) 참조.
