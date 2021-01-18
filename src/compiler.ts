import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { spawnSync, spawn } from 'child_process';
import includes from 'lodash/includes';

import { isWin, debugCompiler, getCrateName } from './utils';
import { RswConfig, RswPluginOptions, RswCrateOptions } from './types';

function compileOne(config: RswConfig, crate: string | RswCrateOptions, root: string, sync: boolean) {
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
    pkgName = a?.[2];
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
    checkStatus(root, rswCrate, p.status);
  } else {
    let p = spawn(wp, args, {
      shell: true,
      cwd: rswCrate,
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    p.on('close', code => {
      checkStatus(root, rswCrate, code);
    });
  }
}

export function rswCompile(config: RswPluginOptions, root: string, crate?: string) {
  const { crates, ...opts } = config;

  if (crate) {
    compileOne(opts, crate, root, true);
    return;
  }

  crates.forEach((crate) => {
    compileOne(opts, crate, root, true);
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
      usePolling: true
    }).on('all', (event, _path) => {
      console.log(
        chalk.bgBlueBright(`[rsw::event(${event})] `),
        chalk.yellow(`File ${_path}`),
      );
      rswCompile(config, root, name);
    });
  })
}

function rswPkgLink(root: string, crate: string) {
  const cacheDir = path.resolve(root, 'node_modules/.rsw');

  const runCmd = () => {
    let npm = 'npm';
    if (isWin) {
      npm = 'npm.cmd';
    };
    const npmArgs = ['link', path.resolve(root, crate, 'pkg')];
    spawnSync(npm, npmArgs, {
      shell: true,
      cwd: process.cwd(),
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    fs.appendFileSync(`${cacheDir}/link`, `${crate}\n`);
  }

  const existDir = fs.existsSync(cacheDir);
  if (!existDir) {
    fs.mkdirSync(cacheDir);
    runCmd();
  }
  const data = fs.readFileSync(`${cacheDir}/link`, { encoding: 'utf-8' }).split('\n');
  if (includes(data, crate)) return;
  runCmd();
}

function checkStatus(root: string, crate: string, status: number | null) {
  if (status !== 0) {
    throw chalk.red(`[rsw::error] wasm-pack for crate ${crate} failed`);
  } else {
    rswPkgLink(root, crate);
  }
}
