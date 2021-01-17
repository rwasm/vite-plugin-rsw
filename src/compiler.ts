import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { spawnSync, spawn } from 'child_process';

import { isWin, debugCompiler, getCrateName } from './utils';
import { RswConfig, RswWasmOptions, RswPluginOptions, RswCompileOptions } from './types';

function checkStatus(crate: string, status: number | null) {
  if (status !== 0) {
    throw chalk.red(`[rsw::error] wasm-pack for crate ${crate} failed`);
  }
}

function writeDTS(root: string, fileName: string, crate: RswWasmOptions) {
  const _crate = getCrateName(crate);
  const exist = fs.existsSync(`${root}/src/rsw.d`);
  if (!exist) fs.mkdirSync(`${root}/src/rsw.d`);
  const data = fs.readFileSync(`${root}/${_crate}/pkg/${fileName}.d.ts`);
  fs.writeFileSync(`${root}/src/rsw.d/${_crate}.d.ts`, `declare module "${_crate}" {
${data}
}`);
  console.log(
    chalk.bgBlueBright(`[rsw::DTS] `),
    chalk.yellow(`${root}/src/${_crate}.rsw.d`),
  );
}

function compileOne(config: RswConfig, options: RswWasmOptions, root: string, sync: boolean) {
  const {
    mode = 'dev',
    target = 'web',
  } = config;
  const {
    outName,
    path: _path,
    scope,
  } = options;

  let exe = 'wasm-pack';
  if (isWin) {
    exe = 'wasm-pack.exe';
  }
  const args = ['build', `--${mode}`, '--target', target];
  let out = (outName || _path.substring(_path.lastIndexOf('/') + 1))?.replace('-', '_');
  args.push('--out-name', out)

  if (scope) args.push('--scope', scope);

  debugCompiler('Running subprocess with command:', exe, args.join(' '));

  if (sync) {
    let p = spawnSync(exe, args, {
      shell: true,
      cwd: _path,
      encoding: 'utf-8',
      stdio: ['inherit', 'inherit', 'inherit'],
    })
    checkStatus(out, p.status);
    writeDTS(root, out, options);
  } else {
    let p = spawn(exe, args, {
      shell: true,
      cwd: _path,
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    p.on('close', code => {
      checkStatus(out, code);
      writeDTS(root, out, options);
    });
  }
}

export function rswCompile(config: RswPluginOptions, options: RswCompileOptions) {
  const { crates, ...opts } = config;
  const { root = '', crate, sync = false } = options;
  if (crate) {
    return compileOne(opts, crate, root, sync);
  }
  debugCompiler('Compile using wasm-pack');
  crates.forEach((crate: RswWasmOptions) => {
    compileOne(opts, crate, root, sync);
  })
}

export function rswWatch(config: RswPluginOptions, root: string) {
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
        pollInterval: 10,
      },
      usePolling: true
    }).on('all', (event, _path) => {
      console.log(
        chalk.bgBlueBright(`[rsw::event(${event})] `),
        chalk.yellow(`File ${_path}`),
      );
      rswCompile(config, { root, crate, sync: false });
    });
  })
}