import { describe, it, expect } from 'vitest';
import { parseDesignMd } from '../../../src/scaffold/parse-design.js';
import { ScaffoldError } from '../../../src/scaffold/types.js';
import { loadReference } from '../../../src/core/reference-parser.js';
import { applyOverrides } from '../../../src/core/customizer.js';

describe('parseDesignMd', () => {
  it('extracts brand and theme from omd-ultra–generated DESIGN.md', () => {
    const ref = loadReference('stripe');
    const { designMd } = applyOverrides(ref, { darkMode: false }, 'as-is');

    const parsed = parseDesignMd(designMd);

    expect(parsed.name.toLowerCase()).toContain('stripe');
    expect(parsed.theme.light['--primary']).toBeTruthy();
    expect(parsed.theme.light['--background']).toBeTruthy();
    expect(parsed.theme.light['--radius']).toBeTruthy();
    expect(parsed.theme.light['--ring']).toBeTruthy();
  });

  it('captures .dark block when darkMode requested', () => {
    const ref = loadReference('stripe');
    const { designMd } = applyOverrides(ref, { darkMode: true }, 'as-is');

    const parsed = parseDesignMd(designMd);
    expect(parsed.theme.dark).toBeTruthy();
    expect(parsed.theme.dark!['--background']).toBeTruthy();
  });

  it('omits .dark when darkMode is false', () => {
    const ref = loadReference('vercel');
    const { designMd } = applyOverrides(ref, { darkMode: false }, 'as-is');

    const parsed = parseDesignMd(designMd);
    expect(parsed.theme.dark).toBeUndefined();
  });

  it('throws when :root{} block is missing', () => {
    const md = '# Fake Brand\n\nJust prose, no CSS block.\n';
    expect(() => parseDesignMd(md)).toThrow(ScaffoldError);
  });

  it('throws when required tokens are missing from :root{}', () => {
    const md = `# Minimal\n\n\`\`\`css\n:root { --background: 0 0% 100%; }\n\`\`\`\n`;
    expect(() => parseDesignMd(md)).toThrow(/missing required tokens/);
  });

  it('prefers YAML frontmatter brand over H1 when both present', () => {
    const ref = loadReference('stripe');
    const { designMd } = applyOverrides(ref, { darkMode: false }, 'as-is');
    // The as-is DESIGN.md starts with a YAML frontmatter block declaring brand.
    const parsed = parseDesignMd(designMd);
    expect(parsed.name).toBe('Stripe');
  });
});
