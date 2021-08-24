import os from 'os';
import fs from 'fs';
import path from 'path';
import which from 'which';
import debug from 'debug';
import chalk from 'chalk';
import toml from '@iarna/toml';
import chokidar from 'chokidar';
import { execFileSync, execSync } from 'child_process';
import fg from 'fast-glob';

import { RswCrateOptions, CliType } from './types';
import { cargoToml, crateLib, crateCodeHelp, rswInfo } from './template';

const nodeBin = process.argv[0];

export const sleep = (time: number) => execFileSync(nodeBin, ['-e', `setTimeout(function() {}, ${time});`]);

export const debugRsw = debug('rsw');

export const isWin = os.platform() === 'win32';

export const userRoot = process.env.HOME || '';

export const wpCmd = isWin ? 'wasm-pack.exe' : 'wasm-pack';

export const crateToFilename = (crate: string) => crate.replace(/\//g, '.');

// fix: https://github.com/lencx/vite-plugin-rsw/issues/20#issuecomment-904562812
// ------------------------------------------
// escape a space in a file path in node.js
// normalizePath('foo bar') // 'foo\\ bar'
// -------------------------------------------
// see: https://vitejs.dev/guide/api-plugin.html#path-normalization
// normalizePath('foo\\bar') // 'foo/bar'
// normalizePath('foo/bar') // 'foo/bar'
export const normalizePath = (_path: string) => _path.replace('\\', '/').replace(/(\s+)/g, '\\$1');

export const depsPathsDir = normalizePath(path.resolve(process.cwd(), '.rsw/paths'));

export const npmCmd = (cli?: CliType) => {
  if (cli && ['npm', 'pnpm'].includes(cli)) return cli;
  return 'npm';
}

export const getCrateName = (crate: string | RswCrateOptions): string => (
  typeof crate === 'object' ? crate.name : crate
);

export function getCratePath(crate: string | RswCrateOptions, crateRoot: string) {
  const _name = (crate as RswCrateOptions).name;
  const _root = path.join(crateRoot, _name ? _name : (crate as string));
  if (typeof crate === 'object' && crate.outDir) {
    if (new RegExp(`^${userRoot.replace('/', '\\/')}`).test(crate.outDir)) {
      return crate.outDir;
    }
    if (!crate.outDir.startsWith('/')) {
      return path.resolve(_root, crate.outDir);
    } else {
      console.log(
        chalk.bold.red('[rsw::error]'),
        chalk.red('Invalid outDir ~> Please use `path.resolve` or relative path.'),
        chalk.red(`\n\`${JSON.stringify(crate, null, 2)}\`\n`),
      );
      process.exit();
    }
  }

  return path.resolve(_root, 'pkg');
};

export function getPkgName(crate: string) {
  let rswCrate = getCrateName(crate);
  if (rswCrate.startsWith('@')) {
    const a = rswCrate.split('/');
    return a[1];
  }
  return rswCrate;
}

export function checkENV() {
  const wasmPack = which.sync('wasm-pack', { nothrow: true });
  if (!wasmPack) {
    console.log(
      chalk.bold.red('[rsw::error]'),
      chalk.red('Cannot find wasm-pack in your PATH. Please make sure wasm-pack is installed.'),
    );
    console.log(
      chalk.bold.gray('[rsw::INFO]'),
      'wasm-pack install:',
      chalk.green('https://github.com/rustwasm/wasm-pack'),
    );
    process.exit();
  }

  console.log(rswInfo());
}

export function checkMtime(
  dirs: string,
  cargoToml: string,
  benchmarkFile: string,
  runCallback: Function,
  optimCallback: Function,
) {
  try {
    // benchmark file modified time
    const pkgMtime = fs.statSync(benchmarkFile).mtimeMs;
    const cargoMtime = fs.statSync(cargoToml).mtimeMs;
    let isOptim = true;

    // run wasm-pack
    if (cargoMtime > pkgMtime) {
      isOptim = false;
      return runCallback();
    }

    (function dirsMtime(dir) {
      for (let f of fs.readdirSync(dir)) {
        const _f = fs.statSync(`${dir}/${f}`);

        if (_f.isDirectory()) {
          if (_f.mtimeMs > pkgMtime) {
            // run wasm-pack
            isOptim = false;
            runCallback();
            break;
          } else {
            dirsMtime(`${dir}/${f}`)
          }
        }

        if (_f.isFile()) {
          if (_f.mtimeMs > pkgMtime) {
            // run wasm-pack
            isOptim = false;
            runCallback();
            break;
          }
        }
      }
    })(dirs)

    isOptim && optimCallback();
  } catch(e) {
    // no such file or directory
    runCallback();
  }
}

// load wasm: fetch or URL
export function loadWasm(code: string, oPath: string, nPath: string) {
  console.log(
    chalk.bold.blue('\n[rsw::build]'),
    chalk.yellow(oPath),
    `~>`,
    chalk.green(nPath),
  );

  return code;
}

export function gitInfo() {
  try {
    // fix: https://github.com/lencx/vite-plugin-rsw/issues/10
    const name = execSync(`git config --global user.name`).toString().trim();
    const email = execSync(`git config --global user.email`).toString().trim();
    return { name, email };
  } catch (e) {
    return {};
  }
}

export function getRswPackage() {
  try {
    const pkgJson = normalizePath(path.resolve(process.cwd(), 'node_modules/vite-plugin-rsw/package.json'));
    const data = fs.readFileSync(pkgJson, { encoding: 'utf-8' });
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

export function checkCrate(cratePath: string, crate: string) {
  const _root = path.resolve(cratePath, crate);
  const _cargoToml = path.resolve(_root, 'Cargo.toml');
  const tomlExists = fs.existsSync(_cargoToml);
  if (tomlExists) return;

  try {
    // crate/src
    fs.mkdirSync(path.resolve(_root, 'src'), { recursive: true });
    // crate/Cargo.toml
    fs.writeFileSync(_cargoToml, cargoToml(crate));
    // crate/src/lib.rs
    fs.writeFileSync(path.resolve(_root, 'src/lib.rs'), crateLib);

    console.log(chalk.yellow(`\n[rsw::code::help] use \`${crate}\`\n${chalk.green(crateCodeHelp(crate))}`));
  } catch (e) {
    console.error(e);
  }
}

export function genRswJson(data: string[]) {
  const rswFile = normalizePath(path.resolve(process.cwd(), '.rsw.json'));
  const rswExists = fs.existsSync(rswFile);

  const writeRsw = (type: string) => {
    fs.writeFileSync(rswFile, JSON.stringify({ crates: data }, null, 2));
    console.log(chalk.yellow(`[rsw::${type}] .rsw.json`));
    console.log(chalk.gray(`[rsw::package.json] add command

  {
    "scripts: {
  ${chalk.green`+    "rsw:build": "rsw && npm run build"`}
    }
  }\n`));
  }

  if (!rswExists) return writeRsw('create');

  // match {svelte,vite}.config.{js,ts}
  const configName = fg.sync('{svelte,vite}.config.{js,ts}')?.[0];
  const confFile = normalizePath(path.resolve(process.cwd(), configName));
  const rswMtime = fs.statSync(rswFile).mtimeMs;
  const confMtime = fs.statSync(confFile).mtimeMs;
  if (rswMtime < confMtime) writeRsw('update');
}

export function getDepsPath(entries: string[], crateRoot: string) {
  fs.mkdirSync(depsPathsDir, { recursive: true });

  entries.forEach((entry: string) => {
    const paths = new Set();
    const _crateRoot = path.join(crateRoot, entry);

    const tomlFile = fs.readFileSync(`${_crateRoot}/Cargo.toml`, { encoding: 'utf-8' });
    const tomlData = toml.parse(tomlFile);

    const getVal = (prop: string | null, data: string | Object, root: string): void => {
      if (Array.isArray(data)) return data.forEach((i) => getVal(null, i, root));
      if (data === Object(data)) Object.entries(data).forEach(([key, val]) => getVal(key === 'path' ? key : null, val, root));
      if (prop) {
        const childCrate = path.join(root, data as string);
        paths.add(childCrate);
        try {
          const childTomlFile = fs.readFileSync(`${childCrate}/Cargo.toml`, { encoding: 'utf-8' });
          const childTomlData = toml.parse(childTomlFile);
          getVal(null, [
            childTomlData.target,
            childTomlData.dependencies,
            childTomlData['dev-dependencies'],
            childTomlData['build-dependencies']
          ], childCrate);
        } catch (e) {
          console.error(e);
          process.exit();
        }
      }
    }

    getVal(null, [
      tomlData.target,
      tomlData.dependencies,
      tomlData['dev-dependencies'],
      tomlData['build-dependencies']
    ], _crateRoot);

    fs.writeFileSync(`${depsPathsDir}/${crateToFilename(entry)}`, `${[...paths].join('\n')}`, { encoding: 'utf-8' });
  })
}

export function watchDeps(crate: string, callback: (...args: any) => void) {
  const _crate = crateToFilename(crate);
  const _file = `${depsPathsDir}/${_crate}`;
  try {
    const fileData = fs.readFileSync(_file, { encoding: 'utf-8' });
    fileData.split('\n').forEach((itemPath) => {
      watch([
        path.join(itemPath, 'src'),
        path.join(itemPath, 'Cargo.toml')
      ], 'deps', callback);
    })
  } catch (e) {}
}

export function watch(args: string[], type: 'repo' | 'main' | 'deps', callback: (path: string) => void) {
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
      chalk.blue(`[rsw::${type}::${event}] `),
      chalk.yellow(`File ${_path}`),
    );
    callback(_path);
  });
}
