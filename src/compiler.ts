import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import includes from 'lodash/includes';
import { spawnSync, spawn } from 'child_process';

import { isWin, debugCompiler, getCrateName } from './utils';
import { RswConfig, RswPluginOptions, RswCrateOptions } from './types';

function compileOne(config: RswConfig, crate: string | RswCrateOptions, root: string, sync: boolean, isWatch?: boolean) {
  const {
    mode = 'dev',
    target = 'web',
  } = config;

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
    scope = a?.[1].substring(1);
    pkgName = `${scope}__${a?.[2]}`;
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
    checkStatus(root, rswCrate, p.status, isWatch);
  } else {
    let p = spawn(wp, args, {
      shell: true,
      cwd: rswCrate,
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    p.on('close', code => {
      checkStatus(root, rswCrate, code, isWatch);
    });
  }
}

export function rswCompile(config: RswPluginOptions, root: string, crate?: string, isWatch?: boolean) {
  const { crates, ...opts } = config;

  if (crate) {
    compileOne(opts, crate, root, true, isWatch);
    return;
  }

  const pkgs: string[] = [];
  crates.forEach((crate) => {
    compileOne(opts, crate, root, true, isWatch);
    pkgs.push(path.resolve(root, getCrateName(crate), 'pkg'));
  })
  rswPkgsLink(pkgs.join(' '), isWatch);
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
      usePolling: true
    }).on('all', (event, _path) => {
      console.log(
        chalk.bgBlueBright(`[rsw::event(${event})] `),
        chalk.yellow(`File ${_path}`),
      );
      rswCompile(config, root, name, true);
    });
  })
}

function rswPkgsLink(pkgs: string, isWatch?: boolean) {
  if (isWatch) return;
  let npm = 'npm';
  if (isWin) {
    npm = 'npm.cmd';
  };

  const npmArgs = ['link', pkgs];
  spawnSync(npm, npmArgs, {
    shell: true,
    cwd: process.cwd(),
    stdio: ['inherit', 'inherit', 'inherit'],
  });
}

function checkStatus(root: string, crate: string, status: number | null, isWatch?: boolean) {
  if (status !== 0) {
    throw chalk.red(`[rsw::error] wasm-pack for crate ${crate} failed`);
  }
}
