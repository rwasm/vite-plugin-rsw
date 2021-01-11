import type { Plugin } from 'vite'

import { RswPluginOptions } from './types';
import { compile, watch } from './compiler';
import { debugConfig, checkENV, setRswAlias } from './utils';

export function ViteRsw(config: RswPluginOptions): Plugin {
  debugConfig(config);
  checkENV();

  compile(config, true);

  watch(config, compile);

  return {
    name: 'vite-plugin-rsw',
    config() {
      return {
        alias: setRswAlias(config),
      };
    },
  };
}

export default ViteRsw;
