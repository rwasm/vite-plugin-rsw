import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { spawnSync, exec } from 'child_process';
import type { ViteDevServer } from 'vite';

import { isWin, debugCompiler, getCrateName, checkMtime } from './utils';
import { CompileOneOptions, RswCompileOptions, RswPluginOptions, RswCrateOptions } from './types';

function compileOne(options: CompileOneOptions) {
  const { config, crate, sync, serve, filePath } = options;
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
    pkgName = `${scope}~${a[2]}`;
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
      stdio: 'inherit',
    });
    if (p.status !== 0) {
      console.log(chalk.red(`[rsw::error] wasm-pack for crate ${rswCrate} failed`));
    }
  } else {
    exec(`${wp} ${args.join(' ')}`, { cwd: rswCrate }, (_, _2, stderr) => {
      if (stderr) {
        console.log(chalk.red(stderr));
        console.log(chalk.red(`[rsw::error] wasm-pack for crate ${rswCrate} failed`));
        serve && serve.ws.send({
          type: 'error',
          err: {
            plugin: 'rsw',
            id: filePath,
            message: `[rsw::compile::error]\n${stderr}`,
            stack: '',
          },
        });
      }
    });
  }
}

export function rswCompile(options: RswCompileOptions) {
  const { config, root, crate, serve, filePath } = options;
  const { crates, unLinks, ...opts } = config;

  // watch: file change
  if (crate) {
    compileOne({ config: opts, crate, sync: false, serve, filePath });
    return;
  }

  // init
  // npm unlink
  if (unLinks && unLinks.length > 0) {
    rswPkgsLink(unLinks.join(' '), 'unlink');
    console.log(chalk.bgRed(`[rsw::unlink]`));
    console.log(chalk.bgBlueBright(`  ↳ ${unLinks.join(' \n  ↳ ')} `));
  }

  console.log();
  // compile & npm link
  const pkgMap = new Map<string, string>();
  crates.forEach((_crate) => {
    const srcPath = path.resolve(root, getCrateName(_crate), 'src');
    const pkgPath = path.resolve(root, getCrateName(_crate), 'pkg');
    const cargoPath = path.resolve(root, getCrateName(_crate), 'Cargo.toml');

    // vite startup optimization
    checkMtime(
      srcPath,
      cargoPath,
      `${pkgPath}/package.json`,
      () => compileOne({ config: opts, crate: _crate, sync: true }),
      () => console.log(chalk.yellow(`[rsw::optimized] wasm-pack build ${getCrateName(_crate)}`)),
    );

    // rust crates map
    pkgMap.set(getCrateName(_crate), pkgPath);
  })
  rswPkgsLink(Array.from(pkgMap.values()).join(' '), 'link');
  console.log(chalk.bgGreen(`[rsw::link]`))
  pkgMap.forEach((val, key) => {
    console.log(
      chalk.bgBlueBright(`  ↳ ${key} `),
      chalk.blueBright(` ${val} `)
    );
  })
}

export function rswWatch(config: RswPluginOptions, root: string, serve: ViteDevServer) {
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
        chalk.blue(`[rsw::event(${event})] `),
        chalk.yellow(`File ${_path}`),
      );
      rswCompile({ config, root, crate: name, serve, filePath: _path });
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


export interface ErrorPayload {
  type: 'error'
  err: {
    [name: string]: any
    message: string
    stack: string
    id?: string
    frame?: string
    plugin?: string
    pluginCode?: string
    loc?: {
      file?: string
      line: number
      column: number
    }
  }
}