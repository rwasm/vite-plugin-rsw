import type { Plugin, ResolvedConfig } from 'vite';

import { watch, getCrates } from './watch';
import fmtRustError from './rswerr';
import { rswOverlay, rswHot } from './template';

export function ViteRsw(): Plugin {
  let config: ResolvedConfig;

  const { crates, cratesPath } = getCrates();
  const re1 = crates.join('|').replace('/', '\\/');
  const re2 = cratesPath.map(i => `${i}/.*.js`).join('|').replace('/', '\\/');
  const ids: string[] = [];

  return {
    name: 'vite-plugin-rsw',
    enforce: 'pre',
    apply: 'serve',
    configResolved(_config) {
      config = _config;
    },
    handleHotUpdate({ file, server }) {
      if (!/(\/debug\/)|(\/\.rsw\/)/.test(file) && ids.includes(file)) {
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
        });
      }
    },
    transform(code, id) {
      if (new RegExp(`${re1}`).test(code)) {
        ids.push(id);
      }
      if (new RegExp(`${re2}`).test(id)) {
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
