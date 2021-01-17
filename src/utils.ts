import type { AliasOptions } from 'vite';
import which from 'which';
import debug from 'debug';
import chalk from 'chalk';
import path from 'path';
import slash from 'slash';
import os from 'os';

import { RswPluginOptions, RswWasmOptions } from './types';

export const debugStart = debug('rsw:start');
export const debugConfig = debug('rsw:config');
export const debugCompiler = debug('rsw:compiler');

export const isWin = os.platform() === 'win32';
export const bareImportRE = /^[\w@]/;

export const getCrateName = (crate: RswWasmOptions) => crate.pkgName || crate.path.substring(crate.path.lastIndexOf('/') + 1);

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

export function setRswAlias(config: RswPluginOptions): AliasOptions {
  return config.crates.map((crate) => {
    return {
      find: getCrateName(crate),
      replacement: path.resolve(crate.path, 'pkg'),
    }
  })
}

export function normalizePath(id: string): string {
  if (isWin) {
    return path.posix.normalize(slash(id.replace(/^[A-Z]:/i, '')));
  }
  return path.posix.normalize(id);
}
