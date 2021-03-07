import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import type { Plugin, ResolvedConfig } from 'vite';

import { rswCompile, rswWatch } from './compiler';
import { RswPluginOptions, WasmFileInfo } from './types';
import { debugConfig, checkENV, getCrateName } from './utils';

const wasmMap = new Map<string, WasmFileInfo>();

export function ViteRsw(userOptions: RswPluginOptions): Plugin {
  let config: ResolvedConfig;
  const crateRoot = path.resolve(process.cwd(), userOptions.root || '');
  const crateList = userOptions.crates.map(i => getCrateName(i));

  debugConfig(userOptions);
  checkENV();

  return {
    name: 'vite-plugin-rsw',
    enforce: 'pre',

    configResolved(_config) {
      config = _config;
    },
    configureServer() {
      rswCompile({
        config: userOptions,
        root: crateRoot,
      });
      rswWatch(userOptions, crateRoot);
    },
    transform(code, id) {
      if (new RegExp(`(${crateList.join('|')})` + '\\/pkg/.*.js').test(id)) {
        const re = id.indexOf('@') > 0 ? '([@\\/].*)' : '';
        const _path = id.match(new RegExp(`.*(.*${re}([\\/].*){3}).js$`)) as string[];
        const fileId = _path?.[1].replace(/^\//, '') + '_bg.wasm';

        // build wasm file
        if (!wasmMap.has(fileId) && config?.mode !== 'development') {
          const source = fs.readFileSync(path.resolve(crateRoot, fileId));
          const hash = createHash('md5').update(String(source)).digest('hex').substring(0, 8);
          const _name = config?.build?.assetsDir + '/' + path.basename(fileId).replace('.wasm', `.${hash}.wasm`);
          wasmMap.set(fileId, {
            fileName: _name,
            source,
          });

          // fix: fetch or URL
          code = code.replace('import.meta.url.replace(/\\.js$/, \'_bg.wasm\');', `fetch('${_name}')`);
          code = code.replace(`new URL('${path.basename(fileId)}', import.meta.url)`, `new URL('${_name}', location.origin)`);

          return code;
        }

        // fix: absolute path
        return code.replace('import.meta.url.replace(/\\.js$/, \'_bg.wasm\');', `fetch('/${fileId}')`);
      }
      return code;
    },
    generateBundle() {
      wasmMap.forEach((i: WasmFileInfo) => {
        this.emitFile({
          fileName: i.fileName,
          type: 'asset',
          source: (i.source as Uint8Array),
        });
      })
    }
  };
}

export default ViteRsw;
