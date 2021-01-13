import type { Plugin } from 'vite'

import { RswPluginOptions } from './types';
import { rswCompile, rswWatch } from './compiler';
import { debugConfig, checkENV, setRswAlias } from './utils';

export function ViteRsw(config: RswPluginOptions): Plugin {
  debugConfig(config);
  checkENV();

  rswCompile(config, true);

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
