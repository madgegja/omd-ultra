// Parse a DESIGN.md file back into structured data for scaffolding.
//
// omd-ultra treats DESIGN.md as a compilation source (see spec § 2).
// The authoritative token source is the shadcn/ui `:root {}` CSS block
// that applyOverrides() injects into every generated DESIGN.md.
//
// Parser strategy:
//   1. Extract YAML frontmatter for brand metadata (optional).
//   2. Find the H1 heading ("# <brand>") — required for brand name fallback.
//   3. Find the fenced CSS code block that contains `:root {` — required.
//   4. Inside that block, pull every `--var: value;` declaration.
//      Split between :root {} (light) and .dark {} (optional dark).
//
// Anything else (prose, § 15 motion narratives, etc.) is not parsed here.
// Motion tokens live in a future iteration; parseMotion returns undefined.

import type { ParsedDesign, MotionTokens } from './types.js';
import { ScaffoldError } from './types.js';

// ── Public entry ─────────────────────────────────────────────────

export function parseDesignMd(markdown: string): ParsedDesign {
  const name = extractBrandName(markdown);
  const { light, dark } = extractRootBlock(markdown);
  validateRequiredTokens(light);

  return {
    name,
    theme: dark ? { light, dark } : { light },
    motion: undefined,
    raw: markdown,
  };
}

export function parseMotion(_sectionBody: string): MotionTokens | undefined {
  // Not implemented in this iteration. OmD v0.1 treats motion as optional.
  return undefined;
}

// ── Brand name ───────────────────────────────────────────────────

function extractBrandName(md: string): string {
  // Prefer YAML frontmatter `brand:` field.
  const fmMatch = md.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const brandLine = fmMatch[1].split('\n').find((l) => l.trim().startsWith('brand:'));
    if (brandLine) {
      const value = brandLine.split(':').slice(1).join(':').trim();
      if (value) return stripQuotes(value);
    }
  }

  // Fallback: first H1.
  const h1 = md.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();

  throw new ScaffoldError(
    'Could not determine brand name: neither YAML `brand:` field nor H1 heading found.',
    'frontmatter/h1',
  );
}

function stripQuotes(s: string): string {
  const first = s[0];
  const last = s[s.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return s.slice(1, -1);
  }
  return s;
}

// ── :root / .dark extraction ─────────────────────────────────────

function extractRootBlock(md: string): {
  light: Record<string, string>;
  dark?: Record<string, string>;
} {
  // Find the first CSS code fence that contains `:root {`.
  const fenceRe = /```css\s*\n([\s\S]*?)```/g;
  let cssBody: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(md)) !== null) {
    if (m[1].includes(':root')) {
      cssBody = m[1];
      break;
    }
  }

  if (!cssBody) {
    throw new ScaffoldError(
      'Missing shadcn/ui :root{} CSS block. Regenerate DESIGN.md with omd-ultra so the token block is included.',
      '§ 2 Color Palette & Roles',
    );
  }

  const light = parseVarBlock(cssBody, 'root');
  const dark = parseVarBlock(cssBody, 'dark');
  return { light, dark: dark && Object.keys(dark).length > 0 ? dark : undefined };
}

// Extract CSS variable declarations scoped to either `:root` or `.dark`.
// Handles nesting inside `@layer base { ... }` — we grab the {} that
// immediately follows the selector, matched by counting braces.
function parseVarBlock(
  css: string,
  scope: 'root' | 'dark',
): Record<string, string> {
  const selector = scope === 'root' ? ':root' : '.dark';
  const selectorIdx = css.indexOf(selector);
  if (selectorIdx < 0) return {};

  // Find the opening brace after the selector.
  const openIdx = css.indexOf('{', selectorIdx);
  if (openIdx < 0) return {};

  // Find the matching closing brace.
  let depth = 1;
  let i = openIdx + 1;
  while (i < css.length && depth > 0) {
    const ch = css[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth === 0) break;
    i++;
  }
  if (depth !== 0) return {};

  const body = css.slice(openIdx + 1, i);
  const vars: Record<string, string> = {};
  // Each declaration: --name: value;
  const declRe = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let d: RegExpExecArray | null;
  while ((d = declRe.exec(body)) !== null) {
    vars[d[1].trim()] = d[2].trim();
  }
  return vars;
}

// ── Required-token validation (spec § 2) ─────────────────────────

const REQUIRED_TOKENS = [
  '--background',
  '--foreground',
  '--primary',
  '--primary-foreground',
  '--border',
  '--ring',
  '--radius',
];

function validateRequiredTokens(light: Record<string, string>): void {
  const missing = REQUIRED_TOKENS.filter((t) => !(t in light));
  if (missing.length > 0) {
    throw new ScaffoldError(
      `DESIGN.md :root{} is missing required tokens: ${missing.join(', ')}`,
      '§ 2 Color Palette & Roles',
    );
  }
}
