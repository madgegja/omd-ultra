// omd-ultra scaffold — public entry point.
//
// Pipeline:
//   1. Read DESIGN.md from disk (spec § 4: --source)
//   2. parseDesignMd → ParsedDesign
//   3. emitShadcn → planned component + theme writes
//   4. collectRadixDeps → list extra npm deps for a post-scaffold install hint
//   5. If !dryRun, write planned files; else return plan only.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import type { ScaffoldInput, ScaffoldPlan, ComponentId } from './types.js';
import { ScaffoldError } from './types.js';
import { parseDesignMd } from './parse-design.js';
import { emitShadcn } from './shadcn-emitter.js';
import { collectRadixDeps } from './radix-wrapper.js';

// Default set = components that have a working template as of this MVP.
// Select / dropdown-menu / etc. will land in a follow-up; opt-in via --components.
const DEFAULT_COMPONENTS: ComponentId[] = [
  'button',
  'input',
  'card',
  'dialog',
  'popover',
  'tooltip',
  'tabs',
];

export function runScaffold(input: ScaffoldInput): ScaffoldPlan {
  const markdown = readFileSync(input.designMdPath, 'utf-8');
  const design = parseDesignMd(markdown);

  const requested = input.components ?? DEFAULT_COMPONENTS;
  const writes = emitShadcn({ design, components: requested });

  const warnings: string[] = [];

  // Detect components that were requested but skipped because no template exists yet.
  const emittedIds = new Set(
    writes
      .filter((w) => w.kind === 'component')
      .map((w) => w.path.replace(/^components\/ui\//, '').replace(/\.tsx$/, '')),
  );
  const skipped = requested.filter((id) => !emittedIds.has(id));
  if (skipped.length > 0) {
    warnings.push(
      `No template yet for: ${skipped.join(', ')} — open an issue or contribute a wrapper.`,
    );
  }

  // Base runtime deps are required whenever we emit any component
  // (cn() uses clsx + tailwind-merge; Button uses cva).
  const emittedComponents = requested.filter((id) => emittedIds.has(id));
  if (emittedComponents.length > 0) {
    const baseDeps = ['clsx', 'tailwind-merge', 'class-variance-authority'];
    const radixDeps = collectRadixDeps(emittedComponents);
    warnings.push(
      `Install runtime deps: npm i ${[...baseDeps, ...radixDeps].join(' ')}`,
    );
  }

  if (!input.dryRun) {
    for (const w of writes) {
      const outPath = resolve(input.outDir, w.path);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, w.contents, 'utf-8');
    }
  }

  return { writes, warnings };
}

export { ScaffoldError };
export type { ScaffoldInput, ScaffoldPlan } from './types.js';
