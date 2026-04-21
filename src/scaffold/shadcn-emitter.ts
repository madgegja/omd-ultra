// Emit shadcn/ui component source files with OmD-derived theme variables applied.
//
// Relationship to src/core/shadcn-mapper.ts:
//   core/shadcn-mapper   — DesignTokens → ShadcnTheme (CSS variables only)
//   scaffold/shadcn-emitter — ShadcnTheme + component selection → actual .tsx / .css files
//
// The emitter does not own component templates; it consumes the shadcn
// component source layout (as of shadcn-ui v4.x) and parameterizes class
// strings + token usage. Component *behavior* delegates to radix-wrapper
// for any interactive primitive (see types.ts RADIX_BACKED).

import type { ParsedDesign, PlannedWrite, ComponentId } from './types.js';

export interface EmitShadcnOptions {
  design: ParsedDesign;
  components: ComponentId[];
}

export function emitShadcn(_opts: EmitShadcnOptions): PlannedWrite[] {
  // TODO(omd-ultra): emit planned writes.
  //
  // Expected outputs (per spec § 1 "Layered output model"):
  //   theme/globals.css        — :root { ... } + .dark { ... } from ParsedDesign.theme
  //   theme/tailwind.preset.js — Tailwind preset with motion tokens
  //   components/ui/<id>.tsx   — one file per component in opts.components
  //
  // For RADIX_BACKED components, delegate internals to radix-wrapper.ts;
  // this emitter only stamps the shadcn *shell* (class strings, variant
  // mappings, exports).
  return [];
}

// Render :root and .dark CSS variable blocks from a ShadcnTheme.
// Pure string formatting; no side effects.
export function renderThemeCss(_design: ParsedDesign): string {
  // TODO(omd-ultra): mirror preview-generator's CSS-emission style for consistency.
  return '';
}
