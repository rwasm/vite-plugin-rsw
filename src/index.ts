import type { Plugin } from 'vite'

import { RswPluginOptions } from './types';
import { compile } from './compiler';
import { debugConfig, checkENV } from './utils';

const URL_PREFIX = '/@rsw/';

// function urlForCrate(crate: string, ...pathes: string[]): string {
//   let tail = pathes.map(p => p.replace(/\\/g, '/')).join('/')
//   return `${URL_PREFIX}${crate}/${tail}`;
// }

export function ViteRsw(config: RswPluginOptions): Plugin {
  debugConfig(config);
  checkENV();

  compile(config, false);

  return {
    name: 'vite-plugin-rsw',
  }
}

export default ViteRsw;