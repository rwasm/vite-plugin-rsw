import type { Plugin, ViteDevServer } from 'vite';

import { RswPluginOptions } from './types';
import { rswCompile, rswWatch } from './compiler';
import {
  debugConfig,
  checkENV,
  setRswAlias,
} from './utils';

export function ViteRsw(userOptions: RswPluginOptions): Plugin {
  let server: ViteDevServer;
  debugConfig(userOptions);
  checkENV();

  return {
    name: 'vite-plugin-rsw',
    enforce: 'pre',

    async configureServer(_server) {
      const root = _server.config.root;
      rswCompile(userOptions, { root, sync: true });
      rswWatch(userOptions, root);
      server = _server;
    },
    config() {
      return {
        alias: setRswAlias(userOptions),
      };
    },
  };
}

export default ViteRsw;
