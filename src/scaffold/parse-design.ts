// Parse a DESIGN.md file back into structured data for scaffolding.
//
// Unlike the OmD generator pipeline (which produces DESIGN.md from tokens),
// scaffold operates on an *existing* DESIGN.md. This file is the inverse
// direction: markdown → tokens.
//
// Strategy: parse only what the scaffold contract (spec § 2) requires.
// Anything else is carried in `raw` for downstream inspection.

import type { ParsedDesign, MotionTokens } from './types.js';
import { ScaffoldError } from './types.js';

export function parseDesignMd(_markdown: string): ParsedDesign {
  // TODO(omd-ultra): implement markdown → ParsedDesign.
  //
  // Sections to extract (spec § 2, § 15):
  //   § 2 Color Palette & Roles   → theme.light / theme.dark CSS variables
  //   § 3 Typography Rules        → --font-sans / --font-mono
  //   § 4 Component Stylings      → --radius
  //   § 6 Depth & Elevation       → shadow tokens (future)
  //   § 15 Motion & Easing        → MotionTokens
  //
  // Required sections that, if missing, must throw ScaffoldError per spec § 2:
  //   §§ 2, 3, 4
  //
  // Approach: drive off the heading structure (## 2. Color Palette & Roles, etc.)
  // rather than free-text NLP. The OmD spec fixes headings, so a heading-driven
  // parser is enough and stays deterministic (non-goal: handling arbitrary markdown).
  throw new ScaffoldError('parseDesignMd: not yet implemented');
}

// Extract motion tokens from § 15 content. Returns undefined if section absent
// (motion is optional per OmD v0.1).
export function parseMotion(_sectionBody: string): MotionTokens | undefined {
  // TODO(omd-ultra): parse named duration/easing tokens.
  return undefined;
}
