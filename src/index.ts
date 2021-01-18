import type { Plugin, ViteDevServer } from 'vite';
import path from 'path';

import { RswPluginOptions } from './types';
import { rswCompile, rswWatch } from './compiler';
import {
  debugConfig,
  checkENV,
  getCrateName,
} from './utils';

export function ViteRsw(userOptions: RswPluginOptions): Plugin {
  let server: ViteDevServer;
  debugConfig(userOptions);
  checkENV();

  const crateList = userOptions.crates.map(i => getCrateName(i));

  return {
    name: 'vite-plugin-rsw',
    enforce: 'pre',

    configureServer(_server) {
      const root = _server.config.root;
      const crateRoot = path.resolve(process.cwd(), userOptions.root || '');

      rswCompile(userOptions, crateRoot);
      rswWatch(userOptions, root);
      server = _server;
    },
    transform(code, id) {
      if (new RegExp(`(${crateList.join('|')})` + '\\/pkg/.*.js').test(id) && server.config.mode === 'development') {
        const re = id.indexOf('@') > 0 ? '([@\\/].*)' : '';
        const _path = id.match(new RegExp(`.*(.*${re}([\\/].*){3}).js$`)) as string[];
        const wasmFile = _path?.[1] + '_bg.wasm';
        return code.replace('import.meta.url.replace(/\\.js$/, \'_bg.wasm\');', `fetch('${wasmFile}')`);
      }
      return code;
    }
  };
}

export default ViteRsw;
