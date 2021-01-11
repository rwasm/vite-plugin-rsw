import which from 'which';
import debug from 'debug';
import chalk from 'chalk';
import path from 'path';
import { RswPluginOptions } from './types';

export const debugStart = debug('rsw:start');
export const debugConfig = debug('rsw:config');
export const debugCompiler = debug('rsw:compiler');

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

export function setRswAlias(config: RswPluginOptions) {
  return config.crates.map((crate) => {
    const _name = crate.path.substring(crate.path.lastIndexOf('/') + 1);
    return {
      find: crate.pkgName || _name,
      replacement: path.resolve(crate.path, 'pkg'),
    }
  })
}
