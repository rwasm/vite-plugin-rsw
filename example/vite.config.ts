import reactRefresh from '@vitejs/plugin-react-refresh';
import { defineConfig } from 'vite';
import { ViteRsw } from 'vite-plugin-rsw';
import path from 'path';

export default defineConfig({
  plugins: [
    reactRefresh(),
    ViteRsw({
      mode: 'release',
      crates: [
        { path: 'rsw', outName: 'hey' },
        { path: path.resolve(__dirname, 'rsw-test') },
        // { pkgName: 'rsw2', path: path.resolve(__dirname, 'rsw-test') },
      ]
    })
  ],
})
