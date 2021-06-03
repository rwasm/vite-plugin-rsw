import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { readFileSync } from 'fs';
import { spawnSync, exec } from 'child_process';
import type { ViteDevServer } from 'vite';

import fmtRustError from './rserr';
import { wpCmd, npmCmd, debugRsw, sleep, getCrateName, checkMtime } from './utils';
import { CompileOneOptions, RswCompileOptions, RswPluginOptions, RswCrateOptions, NpmCmdType } from './types';

const cacheMap = new Map();

function compileOne(options: CompileOneOptions) {
  const { crate, sync, serve, filePath, root = '', outDir } = options;

  const wp = wpCmd();
  // 🚀 build release please use: https://github.com/lencx/rsw-node
  const args = ['build', `--dev`, '--target', 'web'];

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

  args.push('--out-name', pkgName);
  if (scope) args.push('--scope', scope);
  if (outDir) args.push('--out-dir', outDir);

  debugRsw(`[wasm-pack build]: ${args.join(' ')}`);

  // rust crates: custom path
  const crateRoot = path.resolve(root, rswCrate);

  if (sync) {
    let p = spawnSync(wp, args, {
      shell: true,
      cwd: crateRoot,
      encoding: 'utf-8',
      stdio: 'inherit',
    });
    // fix: error exit
    if (p.status !== 0) {
      console.log(chalk.red(`[rsw::error] wasm-pack for crate ${rswCrate} failed.`));
      process.exit();
    }
  } else {
    exec(`${wp} ${args.join(' ')}`, { cwd: crateRoot }, (err, _, stderr) => {
      // fix: no error, returns
      if (!err) {
        serve && serve.ws.send({ type: 'custom', event: 'rsw-error-close' });
        return;
      }

      if (stderr) {
        const { msgTag, msgCmd } = fmtRustError(stderr);
        console.log(msgCmd);
        console.log(chalk.red(`[rsw::error] wasm-pack for crate ${rswCrate} failed.`));

        serve && serve.ws.send({
          type: 'custom',
          event: 'rsw-error',
          data: {
            plugin: '[vite::rsw]',
            message: msgTag,
            id: filePath,
            console: stderr,
          },
        });
      }
    });
  }
}

export function rswCompile(options: RswCompileOptions) {
  const { config, root, crate, serve, filePath, npmType = 'link', cratePathMap } = options;
  const { crates, unLinks, ...opts } = config;

  const pkgsLink = (isRun: boolean = true) => {
    // compile & npm link
    const pkgMap = new Map<string, string>();
    crates.forEach((_crate) => {
      const _name = getCrateName(_crate);
      const srcPath = path.resolve(root, _name, 'src');
      const outDir = cratePathMap?.get(_name) || '';
      const cargoPath = path.resolve(root, _name, 'Cargo.toml');

      // vite startup optimization
      isRun && checkMtime(
        srcPath,
        cargoPath,
        `${outDir}/package.json`,
        () => compileOne({ config: opts, crate: _crate, sync: true, root, outDir: cratePathMap?.get(_name) }),
        () => console.log(chalk.yellow(`[rsw::optimized] wasm-pack build ${_name}.`)),
      );

      // rust crates map
      pkgMap.set(_name, outDir);
    })
    rswPkgsLink(Array.from(pkgMap.values()).join(' '), npmType);
    console.log(chalk.green(`\n[rsw::${npmType}]`));
    pkgMap.forEach((val, key) => {
      console.log(
        chalk.yellow(`  ↳ ${key} `),
        chalk.blue(` ${val} `)
      );
    });
    console.log();
  }

  // package.json dependency changes, re-run `npm link`.
  const pkgJson = path.resolve(root, 'package.json');
  if (filePath === pkgJson) {
    const oData = cacheMap.get('pkgJson');
    const data = readFileSync(pkgJson, { encoding: 'utf-8' })
    const jsonData = JSON.parse(data);
    const nData = JSON.stringify({ ...(jsonData.dependencies || {}), ...(jsonData.devDependencies || {}) })

    if (oData !== nData) {
      console.log(chalk.blue(`\n[rsw::relink]`));
      sleep(1000);
      pkgsLink(false);
      cacheMap.set('pkgJson', nData);
    }
    return;
  }

  // watch: file change
  if (crate) {
    compileOne({ config: opts, crate, sync: false, serve, filePath, root, outDir: cratePathMap?.get(crate) });
    return;
  }

  // init
  // npm unlink
  if (unLinks && unLinks.length > 0) {
    rswPkgsLink(unLinks.join(' '), 'unlink');
    console.log();
    console.log(
      chalk.red(`\n[rsw::unlink]`),
      chalk.blue(`  ↳ ${unLinks.join(' \n  ↳ ')} \n`)
    );
  }

  console.log();
  pkgsLink();
}

export function rswWatch(config: RswPluginOptions, root: string, serve: ViteDevServer, cratePathMap: Map<string, string>) {
  watch([path.resolve(root, 'package.json')], (_path) => {
    rswCompile({ config, root, serve, filePath: _path, cratePathMap });
  });

  config.crates.forEach((crate: string | RswCrateOptions) => {
    const name = getCrateName(crate);
    // One-liner for current directory
    // https://github.com/paulmillr/chokidar
    watch([
      path.resolve(root, name, 'src'),
      path.resolve(root, name, 'Cargo.toml'),
    ], (_path) => {
      rswCompile({ config, root, crate: name, serve, filePath: _path, cratePathMap });
    });
  })
}

function rswPkgsLink(pkgs: string, type: NpmCmdType) {
  const npm = npmCmd();
  const npmArgs = [type, pkgs];
  spawnSync(npm, npmArgs, {
    shell: true,
    cwd: process.cwd(),
    stdio: 'inherit',
  });
}

function watch(args: string[], callback: (path: string) => void) {
  chokidar.watch(args, {
    ignoreInitial: true,
    ignored: ['**/node_modules/**', '**/.git/**', '**/target/**'],
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 10,
    },
    usePolling: true,
  }).on('all', (event, _path) => {
    console.log(
      chalk.blue(`[rsw::file::${event}] `),
      chalk.yellow(`File ${_path}`),
    );
    callback(_path);
  });
}
