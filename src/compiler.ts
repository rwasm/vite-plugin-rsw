import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { spawnSync, spawn } from 'child_process';

import { debugCompiler } from './utils';
import { RswConfig, RswWasmOptions, RswPluginOptions, RswWatchCallback } from './types';

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
  if (process.platform === 'win32') {
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

export function compile(config: RswPluginOptions, sync: boolean = false) {
  const { crates, ...opts } = config;
  debugCompiler('Compile using wasm-pack');
  crates.forEach((crate: RswWasmOptions) => {
    compileOne(opts, crate, sync);
  })
}


export function watch(config: RswPluginOptions, wcb: RswWatchCallback) {
  config.crates.forEach((options) => {
    // One-liner for current directory
    // https://github.com/paulmillr/chokidar
    chokidar.watch([
      path.resolve(options.path, 'src'),
      path.resolve(options.path, 'Cargo.toml'),
    ], {
      ignoreInitial: true,
    }).on('all', (event, path) => {
      console.log(
        chalk.bgBlueBright(`[rsw::event(${event})] `),
        chalk.yellow(`File ${path}`),
      );
      wcb(config);
    });
  })
}