import os from 'os';
import fs from 'fs';
import which from 'which';
import debug from 'debug';
import chalk from 'chalk';

import { RswCrateOptions } from './types';

export const debugStart = debug('rsw:start');
export const debugConfig = debug('rsw:config');
export const debugCompiler = debug('rsw:compiler');

export const isWin = os.platform() === 'win32';

export const getCrateName = (crate: string | RswCrateOptions): string => (
  typeof crate === 'object' ? crate.name : crate
);

export function checkENV() {
  const wasmPack = which.sync('wasm-pack', { nothrow: true });
  if (!wasmPack) {
    console.log(
      chalk.bold.red('[rsw::error]'),
      chalk.red('Cannot find wasm-pack in your PATH. Please make sure wasm-pack is installed'),
    );
    console.log(
      chalk.bold.gray('[rsw::INFO]'),
      'wasm-pack install:',
      chalk.green('https://github.com/rustwasm/wasm-pack'),
    );
  }
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
  code = code.replace('import.meta.url.replace(/\\.js$/, \'_bg.wasm\');', `fetch('${nPath}')`);
  code = code.replace(`new URL('${oPath}', import.meta.url)`, `new URL('${nPath}', location.origin)`);
  return code;
}

export function genLibs(src: string, dest: string) {
  const srcExists = fs.existsSync(src);
  if (!srcExists) return;

  dest = dest.startsWith('/') ? dest.substring(1) : dest;
  const exists = fs.existsSync(dest);
  const _dest = dest.split('/');
  if (exists) {
    fs.rmdirSync(_dest[0], { recursive: true });
  }
  _dest.reduce((prev: string, next: string) => {
    prev += `/${next}`;
    const currDir = prev.startsWith('/') ? prev.substring(1) : prev;
    const exists = fs.existsSync(currDir);
    if (!exists) {
      fs.mkdirSync(currDir);
    }
    return prev;
  }, '')

  const pkgInfo = fs.readFileSync(`${src}/package.json`, 'utf8');
  const pkgJson = JSON.parse(pkgInfo);
  const wasmFile = pkgJson.module.replace('.js', '_bg.wasm');
  const pkgName = pkgJson.name;

  fs.readdirSync(src).forEach((file) => {
    switch (true) {
      case file === '.gitignore': return;
      case file === 'package-lock.json': return;
      case file === pkgJson.module: {
        let code = fs.readFileSync(`${src}/${file}`, 'utf8');
        if (code) {
          code = loadWasm(code, wasmFile, wasmFile);
          fs.writeFileSync(`${dest}/${file}`, code);
          console.log(chalk.greenBright(`  ↳ ${pkgName}`));
        }
        return;
      }
      default: fs.copyFileSync(`${src}/${file}`, `${dest}/${file}`);
    }
  });
}