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
      chalk.bold.gray('[rsw::INFO]'),
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
}