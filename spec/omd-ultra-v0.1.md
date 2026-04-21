# omd-ultra Spec v0.1 — Scaffolding Extension

| Field | Value |
|---|---|
| Spec version | `0.1.0` |
| Extends | OmD v0.1 (see [`omd-v0.1.md`](./omd-v0.1.md)) |
| Adds | Scaffolding layer — `DESIGN.md` → shadcn/ui + Radix UI component code |
| Target consumer | Developers consuming OmD-format `DESIGN.md` on a shadcn/Radix stack |
| Relationship | Additive. OmD v0.1 stays stack-agnostic; omd-ultra is an opinionated stack binding for it. |
| Status | Draft |

---

## 0. Why this extension exists

OmD v0.1 is — by deliberate design — **a spec, not a code generator**. It produces one artifact: `DESIGN.md`. The stated reason is that stacks change (shadcn/ui → something else → something after that) while brand philosophy doesn't. That boundary is correct for a spec.

But developers on a **known stack** pay a tax for that boundary: every project, someone re-translates the same `DESIGN.md` into the same shadcn variables and the same Radix wrappers. The tax is mechanical, repeatable, and a fine target for a generator.

**omd-ultra** closes that gap for one opinionated stack:

- **shadcn/ui** — component source (Tailwind + CSS variables)
- **Radix UI** — accessibility primitives for interactive components

omd-ultra does **not** replace OmD. An OmD-format `DESIGN.md` remains the single source of truth. omd-ultra adds a second output — a code bundle — that is regenerable from the same `DESIGN.md`.

```
             OmD v0.1 (stack-agnostic spec)
                        │
                   DESIGN.md
                        │
        ┌───────────────┴───────────────┐
        │                               │
   human reads                   omd-ultra scaffold
   (stays valid forever)         (regenerable, stack-bound)
                                        │
                                 ┌──────┴──────┐
                             shadcn/ui     Radix UI
                              theme +     primitives
                             components
```

## 1. Layered output model

omd-ultra produces three output surfaces from one `DESIGN.md`:

| Surface | Source | Regenerable? | Owned by |
|---|---|---|---|
| `DESIGN.md` | OmD v0.1 | Yes (from reference + overrides) | Spec layer |
| `theme/` (CSS variables, Tailwind config) | OmD tokens → shadcn mapping | Yes | Scaffold layer |
| `components/ui/` (shadcn + Radix sources) | shadcn templates + OmD brand context | Yes | Scaffold layer |

Re-running `omd-ultra scaffold` is the canonical update path. Hand-edits to generated files are permitted but marked regenerable; users who want hand-customization should eject (copy out of the `components/ui/` tree) rather than modify in place.

## 2. Token mapping contract

Every shadcn CSS variable used in generated output **must** trace back to a specific OmD section:

| shadcn variable | OmD source | Notes |
|---|---|---|
| `--background`, `--foreground` | § 2 Color Palette & Roles | light + optional dark |
| `--primary`, `--primary-foreground` | § 2 Color Palette & Roles (primary) | |
| `--border`, `--input`, `--ring` | § 2 + § 6 Depth & Elevation | ring maps to focus treatment |
| `--radius` | § 4 Component Stylings (borderRadius) | |
| `--font-sans`, `--font-mono` | § 3 Typography Rules | |
| Motion tokens (Tailwind animation) | § 15 Motion & Easing | duration + easing as Tailwind extensions |

A scaffold run **must fail loud** (not silently fall back) if a required OmD section is missing. This is a deliberate departure from OmD's permissive-additive posture: OmD lets `DESIGN.md` be read as a document; omd-ultra treats it as a compilation source.

## 3. Radix accessibility contract

Any interactive primitive that shadcn normally ships as a raw composition **must** be re-emitted through a Radix wrapper in omd-ultra output:

- `Dialog`, `AlertDialog` — Radix `@radix-ui/react-dialog`
- `Popover`, `Tooltip` — Radix `@radix-ui/react-popover`, `@radix-ui/react-tooltip`
- `Select`, `Combobox` — Radix `@radix-ui/react-select`
- `Dropdown`, `ContextMenu` — Radix menu primitives
- `Tabs` — Radix `@radix-ui/react-tabs`
- `Accordion`, `Collapsible` — Radix accordion/collapsible

The wrapper owns focus management, keyboard routing, and ARIA attribution. Brand styling (from OmD) is applied via Tailwind classes only, never by replacing Radix-managed attributes.

## 4. CLI surface

Added to the existing OmD CLI:

```
omd-ultra generate          # unchanged — emits DESIGN.md
omd-ultra scaffold [options] # NEW — emits theme/ + components/ui/ from DESIGN.md
  --source <path>            # DESIGN.md path (default: ./DESIGN.md)
  --out <path>               # output dir (default: ./omd-out)
  --components <list>        # subset; default = all mapped components
  --dry-run                  # print planned writes, do not touch disk
```

`scaffold` reads an **existing** `DESIGN.md`. It does not re-run the interactive wizard. This keeps the scaffold step deterministic and CI-friendly.

## 5. Non-goals

- Replacing OmD. OmD remains authoritative for the spec. omd-ultra is a consumer.
- Supporting non-shadcn / non-Radix stacks. Other stacks should write their own consumer layer against the same OmD `DESIGN.md`.
- Emitting application-level code (pages, routes, business logic). Scaffold output is limited to design-system primitives.
- Running AI calls. Same zero-AI posture as OmD.

## 6. Versioning

omd-ultra follows OmD's major version. An omd-ultra v`0.1.x` release consumes OmD v`0.1.x` `DESIGN.md` files. Breaking changes to the token mapping contract (§ 2) or Radix contract (§ 3) require a major bump.
