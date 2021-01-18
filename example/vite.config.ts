import reactRefresh from '@vitejs/plugin-react-refresh';
import { defineConfig } from 'vite';
import ViteRsw from 'vite-plugin-rsw';
import path from 'path';

export default defineConfig({
  plugins: [
    reactRefresh(),
    ViteRsw({
      // root: 'abc',
      mode: 'release',
      // target: 'web',
      crates: [
        '@rsw/hey',
        'rsw-test',
      ]
    }),
  ],
})
