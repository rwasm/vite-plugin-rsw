# vite-plugin-rsw

> wasm-pack plugin for vite@v2

## TODO

- [x] watch crates
- [x] multiple crates
- [x] npm link
- [ ] vite build

## Getting Started

> Install rsw

```bash
npm i -D vite-plugin-rsw
```

> vite.config.ts

```js
import { defineConfig } from 'vite'
import ViteRsw from 'vite-plugin-rsw';
import path from 'path';

export default defineConfig({
  plugins: [
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
```
