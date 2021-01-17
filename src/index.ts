import type { Plugin, ViteDevServer } from 'vite';

import { RswPluginOptions } from './types';
import { rswCompile, rswWatch } from './compiler';
import {
  debugConfig,
  checkENV,
  setRswAlias,
  getCrateName,
} from './utils';

export function ViteRsw(userOptions: RswPluginOptions): Plugin {
  let server: ViteDevServer;
  debugConfig(userOptions);
  checkENV();

  const crateList = userOptions.crates.map(i => getCrateName(i))

  return {
    name: 'vite-plugin-rsw',
    enforce: 'pre',

    config() {
      return {
        alias: setRswAlias(userOptions),
      };
    },
    configureServer(_server) {
      const root = _server.config.root;
      rswCompile(userOptions, { root, sync: true });
      rswWatch(userOptions, root);
      server = _server;
    },
    transform(code, id) {
      if (new RegExp(`(${crateList.join('|')})` + '\\/pkg/.*.js').test(id) && server.config.mode === 'development') {
        const _path = id.match(/.*(.*([\\/].*){3}).js$/) as string[];
        const wasmFile = _path?.[1] + '_bg.wasm';
        return code.replace('import.meta.url.replace(/\\.js$/, \'_bg.wasm\');', `fetch('${wasmFile}')`);
      }
      return code;
    }
  };
}

export default ViteRsw;
