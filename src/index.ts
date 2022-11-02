import type { Plugin, ResolvedConfig } from 'vite';

import { watch, getCrates } from './watch';
import fmtRustError from './rswerr';
import { rswOverlay, rswHot } from './template';

const toUnixPath = (path: string) => path.replace(/[\\/]+/g, '/').replace(/^([a-zA-Z]+:|\.\/)/, '');

export function ViteRsw(): Plugin {
  let config: ResolvedConfig;

  const { cratesPath } = getCrates();
  // const re1 = crates.join('|');
  const re2 = cratesPath.map(i => `${i}/.*.js`).join('|');

  return {
    name: 'vite-plugin-rsw',
    enforce: 'pre',
    apply: 'serve',
    configResolved(_config) {
      config = _config;
    },
    handleHotUpdate({ file, server }) {
      let isInit = true;
      const _file = toUnixPath(file);
      if (/\/target(\/[\d\w-_]+)?\/debug\//.test(_file) || /\.rsw\//.test(_file)) return;
      if (/\.rs$/.test(_file)) {
        watch((opts) => {
          if (opts.status === 'ok') {
            server.ws.send({
              type: 'full-reload',
              path: '*'
            });
          }
          if (opts.status === 'err') {
            server.ws.send({
              type: 'custom',
              event: 'rsw-error',
              data: {
                plugin: '[vite::rsw]',
                message: fmtRustError(opts.error),
                id: opts.path,
                console: opts.error,
              },
            });
          }
        }, isInit);
      }
    },
    transform(code, id) {
      const _id = toUnixPath(id);
      if (new RegExp(`${re2}`).test(_id)) {
        return code + rswHot;
      }
      return code;
    },
    transformIndexHtml(html) {
      // compiler error overlay
      if (config?.mode === 'development') {
        return [
          {
            tag: 'script',
            attrs: { type: 'module' },
            children: rswOverlay,
          },
        ]
      }
      return html;
    },
  };
}

export default ViteRsw;
