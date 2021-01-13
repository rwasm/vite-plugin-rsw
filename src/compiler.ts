import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { spawnSync, spawn } from 'child_process';

import { isWin, debugCompiler, getCrateName } from './utils';
import { RswConfig, RswWasmOptions, RswPluginOptions } from './types';

function checkStatus(crate: string, status: number | null) {
  if (status !== 0) {
    throw chalk.red(`[rsw::error] wasm-pack for crate ${crate} failed`);
  }
}

function compileOne(config: RswConfig, options: RswWasmOptions, sync: boolean) {
  const {
    mode = 'dev',
    target = 'web',
  } = config;
  const {
    outName,
    path,
    scope,
  } = options;

  let exe = 'wasm-pack';
  if (isWin) {
    exe = 'wasm-pack.exe';
  }
  const args = ['build', `--${mode}`, '--target', target];
  let out = (outName || path.substring(path.lastIndexOf('/') + 1))?.replace('-', '_');
  args.push('--out-name', out)

  if (scope) args.push('--scope', scope);

  debugCompiler('Running subprocess with command:', exe, args.join(' '));

  if (sync) {
    let p = spawnSync(exe, args, {
      shell: true,
      cwd: path,
      encoding: 'utf-8',
      stdio: ['inherit', 'inherit', 'inherit'],
    })
    checkStatus(out, p.status)
  } else {
    let p = spawn(exe, args, {
        shell: true,
        cwd: path,
        stdio: ['inherit', 'inherit', 'inherit'],
    });
    p.on('close', code => {
      checkStatus(out, code)
    });
  }
}

export function rswCompile(config: RswPluginOptions, sync: boolean = false) {
  const { crates, ...opts } = config;
  debugCompiler('Compile using wasm-pack');
  crates.forEach((crate: RswWasmOptions) => {
    compileOne(opts, crate, sync);
  })
}

export function rswWatch(config: RswPluginOptions) {
  return new Promise((_, resolve) => {
    config.crates.forEach((crate: RswWasmOptions) => {
      // One-liner for current directory
      // https://github.com/paulmillr/chokidar
      chokidar.watch([
        path.resolve(crate.path, 'src'),
        path.resolve(crate.path, 'Cargo.toml'),
      ], {
        ignoreInitial: true,
        ignored: ['**/node_modules/**', '**/.git/**'],
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 10
        },
        usePolling: true
      }).on('all', (event, _path) => {
        console.log(
          chalk.bgBlueBright(`[rsw::event(${event})] `),
          chalk.yellow(`File ${_path}`),
        );
        rswCompile(config, false);
        resolve(path.resolve(crate.path, `pkg/${getCrateName(crate)}_bg.wasm`));
      });
    })
  })
}