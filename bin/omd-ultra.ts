import { Command } from 'commander';
import { run } from '../src/cli/index.js';

const program = new Command();

program
  .name('omd-ultra')
  .description('OmD + shadcn/ui + Radix UI — extended DESIGN.md generator with component scaffolding')
  .version('0.1.0');

program
  .command('generate', { isDefault: true })
  .description('Generate DESIGN.md and interactive preview')
  .option('--config <hash>', 'Apply a config hash from the web builder')
  .action(async (opts: { config?: string }) => {
    if (opts.config) {
      // Decode config hash and generate directly without prompts
      const { writeFileSync } = await import('fs');
      const { resolve } = await import('path');

      // Decode the hash
      let b64 = opts.config.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const decoded = Buffer.from(b64, 'base64').toString('utf-8');
      const parts = decoded.split('|');

      const refId = parts[0] || 'vercel';
      const overrides = {
        primaryColor: parts[1] || undefined,
        fontFamily: parts[2] || undefined,
        headingWeight: parts[3] || undefined,
        borderRadius: parts[4] || undefined,
        darkMode: parts[5] === '1',
      };
      const components = parts[6] ? parts[6].split(',').filter(Boolean) : [];

      // Load reference and apply
      const { loadReference } = await import('../src/core/reference-parser.js');
      const { applyOverrides } = await import('../src/core/customizer.js');

      const ref = loadReference(refId);
      const mode = (overrides.primaryColor || overrides.fontFamily) ? 'customized' as const : 'as-is' as const;
      const { designMd, shadcnCss, previewData } = applyOverrides(ref, {
        primaryColor: overrides.primaryColor,
        fontFamily: overrides.fontFamily,
        headingWeight: overrides.headingWeight,
        borderRadius: overrides.borderRadius,
        darkMode: overrides.darkMode,
      }, mode, components);

      previewData.shadcnCss = shadcnCss;
      previewData.designMd = designMd;

      const outputDir = process.cwd();
      const mdPath = resolve(outputDir, 'DESIGN.md');
      writeFileSync(mdPath, designMd, 'utf-8');

      console.log(`\x1b[32m✓\x1b[0m DESIGN.md generated at ${mdPath}`);
      console.log(`  Based on: ${ref.name}`);
      if (overrides.primaryColor) console.log(`  Primary: ${overrides.primaryColor}`);
      if (overrides.fontFamily) console.log(`  Font: ${overrides.fontFamily}`);
      if (overrides.headingWeight) console.log(`  Weight: ${overrides.headingWeight}`);
      if (overrides.borderRadius) console.log(`  Radius: ${overrides.borderRadius}`);
      if (overrides.darkMode) console.log(`  Dark mode: included`);
    } else {
      await run();
    }
  });

program
  .command('preview')
  .description('Open the preview HTML in the default browser')
  .action(async () => {
    const { existsSync } = await import('fs');
    const { resolve } = await import('path');
    const previewPath = resolve(process.cwd(), 'DESIGN.preview.html');

    if (!existsSync(previewPath)) {
      console.error('No DESIGN.preview.html found. Run `omd-ultra generate` first.');
      process.exit(1);
    }

    const { exec } = await import('child_process');
    const platform = process.platform;
    const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} "${previewPath}"`);
    console.log(`Opening ${previewPath}...`);
  });

program
  .command('scaffold')
  .description('Generate shadcn/ui + Radix UI component sources from an existing DESIGN.md')
  .option('--source <path>', 'Path to DESIGN.md', 'DESIGN.md')
  .option('--out <path>', 'Output directory', 'omd-out')
  .option('--components <list>', 'Comma-separated component ids (default: core set)')
  .option('--dry-run', 'Print planned writes without touching disk', false)
  .action(async (opts: { source: string; out: string; components?: string; dryRun: boolean }) => {
    const { resolve } = await import('path');
    const { runScaffold } = await import('../src/scaffold/index.js');
    try {
      const plan = runScaffold({
        designMdPath: resolve(process.cwd(), opts.source),
        outDir: resolve(process.cwd(), opts.out),
        components: opts.components
          ? (opts.components.split(',').map((s) => s.trim()) as never)
          : undefined,
        dryRun: opts.dryRun,
      });
      console.log(`\x1b[32m✓\x1b[0m scaffold plan: ${plan.writes.length} file(s)${opts.dryRun ? ' (dry-run)' : ''}`);
      for (const w of plan.writes) console.log(`  ${w.kind.padEnd(10)} ${w.path}`);
      for (const warn of plan.warnings) console.log(`  \x1b[33m!\x1b[0m ${warn}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\x1b[31m✗\x1b[0m scaffold failed: ${msg}`);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('One-shot: generate DESIGN.md from a reference, then scaffold into the project')
  .option('--reference <id>', 'Reference id (e.g. vercel, stripe, toss)', 'vercel')
  .option('--dir <path>', 'Project directory', '.')
  .option('--components <list>', 'Comma-separated component ids (default: core set)')
  .option('--dark', 'Include dark mode tokens', false)
  .action(async (opts: { reference: string; dir: string; components?: string; dark: boolean }) => {
    const { resolve, join } = await import('path');
    const { writeFileSync, existsSync } = await import('fs');
    const projectDir = resolve(process.cwd(), opts.dir);

    try {
      // Step 1: produce DESIGN.md from the chosen reference.
      const { loadReference } = await import('../src/core/reference-parser.js');
      const { applyOverrides } = await import('../src/core/customizer.js');
      const ref = loadReference(opts.reference);
      const { designMd } = applyOverrides(ref, { darkMode: opts.dark }, 'as-is');
      const designPath = join(projectDir, 'DESIGN.md');
      writeFileSync(designPath, designMd, 'utf-8');
      console.log(`\x1b[32m✓\x1b[0m DESIGN.md written at ${designPath} (based on: ${ref.name})`);

      // Step 2: scaffold into the same directory.
      const { runScaffold } = await import('../src/scaffold/index.js');
      const plan = runScaffold({
        designMdPath: designPath,
        outDir: projectDir,
        components: opts.components
          ? (opts.components.split(',').map((s) => s.trim()) as never)
          : undefined,
      });
      console.log(`\x1b[32m✓\x1b[0m scaffold: ${plan.writes.length} file(s) written`);
      for (const w of plan.writes) console.log(`  ${w.kind.padEnd(10)} ${w.path}`);

      // Step 3: hint about npm install. If package.json exists in projectDir,
      // surface a ready-to-paste install command; otherwise tell the user to
      // initialize a project first.
      const hasPkg = existsSync(join(projectDir, 'package.json'));
      if (plan.warnings.length > 0) {
        console.log('');
        for (const w of plan.warnings) console.log(`  \x1b[33m!\x1b[0m ${w}`);
      }
      if (!hasPkg) {
        console.log('');
        console.log(`  \x1b[33m!\x1b[0m No package.json in ${projectDir}. Initialize a project (e.g. \`npm init -y\`) before installing the runtime deps above.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\x1b[31m✗\x1b[0m init failed: ${msg}`);
      process.exit(1);
    }
  });

program.parse();
