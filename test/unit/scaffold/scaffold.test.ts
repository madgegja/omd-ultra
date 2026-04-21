import { describe, it, expect } from 'vitest';
import { tmpdir } from 'os';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { runScaffold } from '../../../src/scaffold/index.js';
import { loadReference } from '../../../src/core/reference-parser.js';
import { applyOverrides } from '../../../src/core/customizer.js';
import type { ComponentId } from '../../../src/scaffold/types.js';

function makeDesignMdFile(refId: string, darkMode = false): { path: string; outDir: string } {
  const tmp = mkdtempSync(join(tmpdir(), 'omd-ultra-'));
  const ref = loadReference(refId);
  const { designMd } = applyOverrides(ref, { darkMode }, 'as-is');
  const designPath = join(tmp, 'DESIGN.md');
  writeFileSync(designPath, designMd, 'utf-8');
  return { path: designPath, outDir: join(tmp, 'out') };
}

describe('runScaffold', () => {
  it('emits theme + utils + default components', () => {
    const { path, outDir } = makeDesignMdFile('stripe');
    const plan = runScaffold({ designMdPath: path, outDir, dryRun: false });

    const kinds = new Set(plan.writes.map((w) => w.kind));
    expect(kinds.has('theme')).toBe(true);
    expect(kinds.has('config')).toBe(true);
    expect(kinds.has('component')).toBe(true);
    expect(kinds.has('index')).toBe(true);

    // Files are actually written to disk.
    expect(existsSync(join(outDir, 'theme/globals.css'))).toBe(true);
    expect(existsSync(join(outDir, 'lib/utils.ts'))).toBe(true);
    expect(existsSync(join(outDir, 'components/ui/button.tsx'))).toBe(true);
    expect(existsSync(join(outDir, 'components/ui/card.tsx'))).toBe(true);
    expect(existsSync(join(outDir, 'components/ui/dialog.tsx'))).toBe(true);
    expect(existsSync(join(outDir, 'components/ui/index.ts'))).toBe(true);
  });

  it('globals.css contains :root variables from DESIGN.md', () => {
    const { path, outDir } = makeDesignMdFile('vercel');
    runScaffold({ designMdPath: path, outDir });

    const css = readFileSync(join(outDir, 'theme/globals.css'), 'utf-8');
    expect(css).toContain(':root {');
    expect(css).toContain('--primary:');
    expect(css).toContain('--radius:');
  });

  it('emits .dark block when source DESIGN.md has dark mode', () => {
    const { path, outDir } = makeDesignMdFile('stripe', true);
    runScaffold({ designMdPath: path, outDir });

    const css = readFileSync(join(outDir, 'theme/globals.css'), 'utf-8');
    expect(css).toContain('.dark {');
  });

  it('Radix wrappers compose Radix primitives (not raw divs)', () => {
    const { path, outDir } = makeDesignMdFile('stripe');
    runScaffold({ designMdPath: path, outDir });

    const dialog = readFileSync(join(outDir, 'components/ui/dialog.tsx'), 'utf-8');
    expect(dialog).toContain("@radix-ui/react-dialog");
    expect(dialog).toContain('DialogPrimitive.Root');

    const popover = readFileSync(join(outDir, 'components/ui/popover.tsx'), 'utf-8');
    expect(popover).toContain('@radix-ui/react-popover');

    const tooltip = readFileSync(join(outDir, 'components/ui/tooltip.tsx'), 'utf-8');
    expect(tooltip).toContain('@radix-ui/react-tooltip');
  });

  it('Button uses theme CSS variables via Tailwind arbitrary values', () => {
    const { path, outDir } = makeDesignMdFile('stripe');
    runScaffold({ designMdPath: path, outDir });

    const btn = readFileSync(join(outDir, 'components/ui/button.tsx'), 'utf-8');
    expect(btn).toContain('hsl(var(--primary))');
    expect(btn).toContain('rounded-[var(--radius)]');
  });

  it('dry-run does not write files to disk', () => {
    const { path, outDir } = makeDesignMdFile('stripe');
    const plan = runScaffold({ designMdPath: path, outDir, dryRun: true });

    expect(plan.writes.length).toBeGreaterThan(0);
    expect(existsSync(join(outDir, 'theme/globals.css'))).toBe(false);
  });

  it('warns about unsupported component ids and includes dep install hint', () => {
    const { path, outDir } = makeDesignMdFile('stripe');
    const plan = runScaffold({
      designMdPath: path,
      outDir,
      components: ['button', 'select'] as ComponentId[], // select has no template yet
      dryRun: true,
    });

    expect(plan.warnings.some((w) => w.includes('select'))).toBe(true);
    expect(plan.warnings.some((w) => w.includes('clsx'))).toBe(true);
  });
});
