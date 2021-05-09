import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { createHash } from 'crypto';
import type { Plugin, ResolvedConfig } from 'vite';

import { rswCompile, rswWatch } from './compiler';
import { RswPluginOptions, WasmFileInfo } from './types';
import { debugRsw, checkENV, getCratePath, loadWasm, genLibs, rswOverlay, rswHot } from './utils';

const wasmMap = new Map<string, WasmFileInfo>();
const cratePathMap = new Map<string, string>();

export function ViteRsw(userOptions: RswPluginOptions): Plugin {
  let config: ResolvedConfig;
  const crateRoot = path.resolve(process.cwd(), userOptions.root || '');
  userOptions.crates.map((i) => {
    const _name = typeof i === 'string' ? i : i.name;
    if (!cratePathMap.has(_name)) {
      cratePathMap.set(_name, getCratePath(i, crateRoot));
    }
  });
  const isLib = userOptions?.isLib || false;
  const libRoot = userOptions?.libRoot || 'libs';
  const re = Array.from(cratePathMap.values()).map(i => `${i}/.*.js`).join('|').replace('/', '\\/');

  debugRsw(`[process.cwd]: ${process.cwd()}`);
  debugRsw(`[crateRoot]: ${crateRoot}`);
  debugRsw(`[userOptions]: ${JSON.stringify(userOptions, null, 2)}`, );
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
        cratePathMap,
      });
      rswWatch(userOptions, crateRoot, serve, cratePathMap);
    },
    transform(code, id) {
      if (new RegExp(`(${re})`).test(id)) {
        const filename = path.basename(id);
        debugRsw(`[fileID]: ${id}`);
        const fileId = id.replace(filename, filename.replace('.js', '_bg.wasm'));

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
        console.log(chalk.blue(`[rsw::lib] ${libRoot}`));
        Array.from(cratePathMap.keys()).forEach(i => {
          genLibs(cratePathMap?.get(i) || '', `${libRoot}/${i}`);
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
