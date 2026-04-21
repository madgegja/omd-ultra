# NOTICE

This project (**omd-ultra**) is a derivative work of **oh-my-design** (OmD),
originally authored by Kwak Seongjae and contributors, and licensed under the MIT License.

- Upstream: https://github.com/kwakseongjae/oh-my-design
- Upstream license: MIT (see `docs/upstream/` for archived READMEs)

## What was absorbed

- `spec/omd-v0.1.md` — OmD v0.1 spec (Google Stitch + Philosophy Layer)
- `references/` — 67+ brand DESIGN.md references
- `src/` — CLI core, reference parser, customizer, renderer, preview generator
- `web/` — Next.js builder application
- `.claude/skills/omd/` — Claude Code skill bundle

## What was added on top

- `spec/omd-ultra-v0.1.md` — extension spec for shadcn/ui + Radix UI component scaffolding
- `src/scaffold/` — component scaffolding layer (shadcn mapper, Radix accessibility wrapper)
- `omd-ultra scaffold` CLI command

## What was renamed

- Package name: `oh-my-design` → `omd-ultra`
- Binary name: `oh-my-design` → `omd-ultra`
- Internal branding in CLI prompts, preview headers, and generated DESIGN.md header

The original `oh-my-design` attribution is preserved in:

- `LICENSE` — derivative-work notice
- Generated `DESIGN.md` files — footer link back to upstream
- `docs/upstream/` — verbatim copies of upstream READMEs
- This file

## Upstream references

Individual `references/<brand>/DESIGN.md` files are curated from publicly available
brand guidelines and design systems. Each reference maintains attribution to its
source brand within the file itself.
