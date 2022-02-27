import type { Plugin, ResolvedConfig } from 'vite';

import { watch } from './watch';
import fmtRustError from './rswerr';
import { rswOverlay } from './template';

export function ViteRsw(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'vite-plugin-rsw',
    enforce: 'pre',
    configResolved(_config) {
      config = _config;
    },
    async handleHotUpdate({ file, server }) {
      if (!/(\/debug\/)|(\/\.rsw\/)/.test(file)) {
        watch((opts) => {
          if (opts.status === 'ok') {
            server.ws.send({ type: 'custom', event: 'rsw-error-close' });
          }
          if (opts.status === 'err') {
            server.ws.send({
              type: 'custom',
              event: 'rsw-error',
              data: {
                plugin: '[vite::rsw]',
                message: fmtRustError(opts.error),
                id: opts.file,
                console: opts.error,
              },
            });
          }
        });
      }
    },
    transformIndexHtml(html) {
      // compiler error overlay
      if (config?.mode === 'development') {
        return html.replace('</html>', `<script>${rswOverlay}</script></html>`);
      }
      return html;
    },
  };
}

export default ViteRsw;
