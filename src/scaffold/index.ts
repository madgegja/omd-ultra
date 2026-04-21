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

const DEFAULT_COMPONENTS: ComponentId[] = [
  'button',
  'input',
  'card',
  'dialog',
  'popover',
  'tooltip',
  'select',
  'tabs',
];

export function runScaffold(input: ScaffoldInput): ScaffoldPlan {
  const markdown = readFileSync(input.designMdPath, 'utf-8');
  const design = parseDesignMd(markdown);

  const components = input.components ?? DEFAULT_COMPONENTS;
  const writes = emitShadcn({ design, components });

  const warnings: string[] = [];
  const deps = collectRadixDeps(components);
  if (deps.length > 0) {
    warnings.push(
      `Install Radix deps: npm i ${deps.join(' ')}`,
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
