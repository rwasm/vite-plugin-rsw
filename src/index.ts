import type { Plugin, ResolvedConfig } from 'vite'

import { RswPluginOptions } from './types';
import { compile, watch } from './compiler';
import { debugConfig, checkENV } from './utils';

const URL_PREFIX = '/@rsw/';

export function ViteRsw(config: RswPluginOptions): Plugin {
  debugConfig(config);
  checkENV();

  compile(config, true);

  watch(config, compile);

  let cfg: ResolvedConfig;

  return {
    name: 'vite-plugin-rsw',
    // enforce: 'post',

    // configResolved(_cfg) {
    //   cfg = _cfg;
    // },
  };
}

export default ViteRsw;