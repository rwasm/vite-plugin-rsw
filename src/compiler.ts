import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import fs from 'fs';
import { spawnSync, spawn } from 'child_process';

import { isWin, debugCompiler, getCrateName } from './utils';
import { CompileOneOptions, RswCompileOptions, RswPluginOptions, RswCrateOptions } from './types';

function compileOne(options: CompileOneOptions) {
  const { config, crate, sync } = options;
  const { mode = 'dev', target = 'web' } = config;

  let wp = 'wasm-pack';
  if (isWin) {
    wp = 'wasm-pack.exe';
  }
  const args = ['build', `--${mode}`, '--target', target];

  let rswCrate: string;
  let pkgName: string;
  let scope: string | undefined;

  rswCrate = getCrateName(crate);

  if (rswCrate.startsWith('@')) {
    const a = rswCrate.match(/(@.*)\/(.*)/) as string[];
    scope = a[1].substring(1);
    pkgName = `${scope}__${a[2]}`;
  } else {
    pkgName = rswCrate;
  }

  args.push('--out-name', pkgName)
  if (scope) args.push('--scope', scope);

  debugCompiler('Running subprocess with command:', wp, args.join(' '));

  if (sync) {
    let p = spawnSync(wp, args, {
      shell: true,
      cwd: rswCrate,
      encoding: 'utf-8',
      stdio: ['inherit', 'inherit', 'inherit'],
    })
    checkStatus(rswCrate, p.status);
  } else {
    let p = spawn(wp, args, {
      shell: true,
      cwd: rswCrate,
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    p.on('close', code => {
      checkStatus(rswCrate, code);
    });
  }
}

export function rswCompile(options: RswCompileOptions) {
  const { config, root, crate } = options;
  const { crates, unLinks, ...opts } = config;

  // watch: file change
  if (crate) {
    compileOne({ config: opts, crate, sync: true });
    return;
  }

  // init
  // npm unlink
  if (unLinks && unLinks.length > 0) {
    rswPkgsLink(unLinks.join(' '), 'unlink');
    console.log(chalk.bgRedBright(`[rsw::unlink]`));
    console.log(chalk.bgBlueBright(`  ↳ ${unLinks.join(' \n  ↳ ')} `));
  }

  // compile & npm link
  const pkgMap = new Map<string, string>();
  crates.forEach((_crate) => {
    const pkgPath = path.resolve(root, getCrateName(_crate), 'pkg');
    // vite startup optimization
    try {
      fs.statSync(`${pkgPath}/package.json`).isFile();
      console.log(chalk.yellow(`[rsw::optimized] wasm-pack build ${getCrateName(_crate)}`));
    } catch (e) {
      compileOne({ config: opts, crate: _crate, sync: true });
    }
    // rust crates map
    pkgMap.set(getCrateName(_crate), pkgPath);
  })
  rswPkgsLink(Array.from(pkgMap.values()).join(' '), 'link');
  console.log(chalk.bgGreenBright(`[rsw::link]`))
  pkgMap.forEach((val, key) => {
    console.log(
      chalk.bgBlueBright(`  ↳ ${key} `),
      chalk.bgMagentaBright(` ${val} `)
    );
  })
}

export function rswWatch(config: RswPluginOptions, root: string) {
  config.crates.forEach((crate: string | RswCrateOptions) => {
    const name = getCrateName(crate);
    // One-liner for current directory
    // https://github.com/paulmillr/chokidar
    chokidar.watch([
      path.resolve(root, name, 'src'),
      path.resolve(root, name, 'Cargo.toml'),
    ], {
      ignoreInitial: true,
      ignored: ['**/node_modules/**', '**/.git/**', '**/target/**'],
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 10,
      },
      usePolling: true,
    }).on('all', (event, _path) => {
      console.log(
        chalk.bgBlueBright(`[rsw::event(${event})] `),
        chalk.yellow(`File ${_path}`),
      );
      rswCompile({ config, root, crate: name });
    });
  })
}

function rswPkgsLink(pkgs: string, type: 'link' | 'unlink') {
  let npm = 'npm';
  if (isWin) {
    npm = 'npm.cmd';
  };

  const npmArgs = [type, pkgs];
  spawnSync(npm, npmArgs, {
    shell: true,
    cwd: process.cwd(),
    stdio: ['inherit', 'inherit', 'inherit'],
  });
}

function checkStatus(crate: string, status: number | null) {
  if (status !== 0) {
    throw chalk.red(`[rsw::error] wasm-pack for crate ${crate} failed`);
  }
}
