// omd-ultra scaffold — type definitions for the scaffolding layer
//
// See spec/omd-ultra-v0.1.md for the contract these types encode.

import type { ShadcnTheme } from '../core/shadcn-mapper.js';

// ── Inputs ───────────────────────────────────────────────────────

export interface ScaffoldInput {
  designMdPath: string;
  outDir: string;
  components?: ComponentId[];
  dryRun?: boolean;
}

// Components that omd-ultra knows how to emit.
// Extend this union as new mappings land in shadcn-mapper / radix-wrapper.
export type ComponentId =
  | 'button'
  | 'input'
  | 'card'
  | 'dialog'
  | 'alert-dialog'
  | 'popover'
  | 'tooltip'
  | 'select'
  | 'dropdown-menu'
  | 'context-menu'
  | 'tabs'
  | 'accordion'
  | 'collapsible'
  | 'sheet'
  | 'toast';

// Which components require a Radix primitive (per spec § 3).
export const RADIX_BACKED: ReadonlySet<ComponentId> = new Set([
  'dialog',
  'alert-dialog',
  'popover',
  'tooltip',
  'select',
  'dropdown-menu',
  'context-menu',
  'tabs',
  'accordion',
  'collapsible',
  'sheet',
]);

// ── Parsed DESIGN.md ─────────────────────────────────────────────

export interface ParsedDesign {
  name: string;
  theme: ShadcnTheme;
  motion?: MotionTokens;
  raw: string;
}

export interface MotionTokens {
  durations: Record<string, string>; // name → ms or s value
  easings: Record<string, string>;   // name → cubic-bezier(...) or keyword
}

// ── Outputs ──────────────────────────────────────────────────────

export interface ScaffoldPlan {
  writes: PlannedWrite[];
  warnings: string[];
}

export interface PlannedWrite {
  path: string;           // relative to outDir
  contents: string;
  kind: 'theme' | 'component' | 'config' | 'index';
}

// ── Errors ───────────────────────────────────────────────────────

export class ScaffoldError extends Error {
  constructor(
    message: string,
    public section?: string, // which DESIGN.md section was missing / invalid
  ) {
    super(message);
    this.name = 'ScaffoldError';
  }
}
