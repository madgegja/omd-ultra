// Generate Radix UI–backed accessibility wrappers for interactive primitives.
//
// Spec § 3 contract: for every ComponentId in RADIX_BACKED, the emitted
// component must compose a Radix primitive (not a raw div stack). The
// wrapper owns focus management, keyboard routing, and ARIA attribution.
// Brand styling (from OmD tokens) is applied via Tailwind classes; Radix
// -managed attributes are never overridden.

import type { ComponentId, PlannedWrite, ParsedDesign } from './types.js';

// Radix package each component dispatches to.
export const RADIX_PACKAGES: Record<string, string> = {
  'dialog': '@radix-ui/react-dialog',
  'alert-dialog': '@radix-ui/react-alert-dialog',
  'popover': '@radix-ui/react-popover',
  'tooltip': '@radix-ui/react-tooltip',
  'select': '@radix-ui/react-select',
  'dropdown-menu': '@radix-ui/react-dropdown-menu',
  'context-menu': '@radix-ui/react-context-menu',
  'tabs': '@radix-ui/react-tabs',
  'accordion': '@radix-ui/react-accordion',
  'collapsible': '@radix-ui/react-collapsible',
  'sheet': '@radix-ui/react-dialog', // shadcn sheet is Dialog-based
};

export function emitRadixWrapper(
  _id: ComponentId,
  _design: ParsedDesign,
): PlannedWrite | null {
  // TODO(omd-ultra): for a given RADIX_BACKED id, render the wrapper TSX.
  //
  // Wrapper responsibilities:
  //   - Import the Radix package (see RADIX_PACKAGES).
  //   - Re-export Radix compound components (Root, Trigger, Content, etc.).
  //   - Attach Tailwind class strings that reference theme CSS variables.
  //   - Do NOT override Radix-managed attrs: `role`, `aria-*`, `data-state`,
  //     focus/keyboard handlers.
  //
  // Return null if id is not RADIX_BACKED — the caller (shadcn-emitter)
  // uses this signal to emit a raw shadcn shell instead.
  return null;
}

// Compute the extra npm dependencies a scaffold run implies, based on which
// Radix packages its selected components touch.
export function collectRadixDeps(ids: ComponentId[]): string[] {
  const deps = new Set<string>();
  for (const id of ids) {
    const pkg = RADIX_PACKAGES[id];
    if (pkg) deps.add(pkg);
  }
  return [...deps].sort();
}
