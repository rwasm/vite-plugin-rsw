import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { createHash } from 'crypto';
import type { Plugin, ResolvedConfig } from 'vite';

import { rswCompile, rswWatch } from './compiler';
import { RswPluginOptions, WasmFileInfo } from './types';
import { debugConfig, checkENV, getCrateName, loadWasm, genLibs, rswOverlay, rswHot } from './utils';

const wasmMap = new Map<string, WasmFileInfo>();

export function ViteRsw(userOptions: RswPluginOptions): Plugin {
  let config: ResolvedConfig;
  const crateRoot = path.resolve(process.cwd(), userOptions.root || '');
  const crateList = userOptions.crates.map(i => getCrateName(i));
  const isLib = userOptions?.isLib || false;
  const libRoot = userOptions?.libRoot || 'libs';

  debugConfig(userOptions);
  checkENV();

  return {
    name: 'vite-plugin-rsw',
    enforce: 'pre',

    configResolved(_config) {
      config = _config;
    },
    configureServer(serve) {
      rswCompile({
        config: userOptions,
        root: crateRoot,
      });
      rswWatch(userOptions, crateRoot, serve);
    },
    transform(code, id) {
      if (new RegExp(`(${crateList.join('|')})` + '\\/pkg/.*.js').test(id)) {
        const re = id.indexOf('@') > 0 ? '([@\\/].*)' : '';
        const _path = id.match(new RegExp(`.*(.*${re}([\\/].*){3}).js$`)) as string[];
        const fileId = _path?.[1].replace(/^\//, '') + '_bg.wasm';

        // build wasm file
        if (!wasmMap.has(fileId) && config?.command !== 'serve') {
          const source = fs.readFileSync(path.resolve(crateRoot, fileId));
          const hash = createHash('md5').update(String(source)).digest('hex').substring(0, 8);
          const _name = config?.build?.assetsDir + '/' + path.basename(fileId).replace('.wasm', `.${hash}.wasm`);
          wasmMap.set(fileId, {
            fileName: _name,
            source,
          });

          // fix: fetch or URL
          code = loadWasm(code, path.basename(fileId), config.base + _name);
          return code;
        }

        // wasm file path and rsw hot
        return code.replace(/import\.meta\.url\.replace\(\/\\\\\.js\$\/, \\'_bg\.wasm\\'\);/, `fetch('/${fileId}')`) + rswHot;
      }
      return code;
    },
    transformIndexHtml(html) {
      // compiler error overlay
      if (config?.mode === 'development') {
        return html.replace('</html>', `<script>${rswOverlay}</script></html>`);
      }
      return html;
    },
    generateBundle() {
      if (isLib) {
        console.log('\n\n');
        console.log(chalk.bgBlue(`[rsw::lib] ${libRoot}`));
        crateList.forEach(i => {
          genLibs(`${crateRoot}/${i}/pkg`, `${libRoot}/${i}`);
        })
        console.log();
      }
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
