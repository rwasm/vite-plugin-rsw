# vite-plugin-rsw

> wasm-pack plugin for Vite

[![npm](https://img.shields.io/npm/v/vite-plugin-rsw.svg)](https://www.npmjs.com/package/vite-plugin-rsw)
[![npm downloads](https://img.shields.io/npm/dm/vite-plugin-rsw.svg)](https://npmjs.org/package/vite-plugin-rsw)
[![vite version](https://img.shields.io/badge/Vite-^2.0.0-000000?style=flat&labelColor=646cff)](https://github.com/vitejs/vite)
[![chat](https://img.shields.io/badge/chat-discord-blue?style=flat&logo=discord)](https://discord.gg/euyYWXTwmk)

[![awesome-rsw](./assets/awesome-rsw.svg)](https://github.com/lencx/awesome-rsw)
[![Rust](https://img.shields.io/badge/-Rust-DEA584?style=flat&logo=rust&logoColor=000000)](https://www.rust-lang.org)
[![WebAssembly](https://img.shields.io/badge/-WebAssembly-654FF0?style=flat&logo=webassembly&logoColor=ffffff)](https://webassembly.org)

|rsw version|vite version|
|---|---|
| >= `2.0.0`| >= `2.8.0`|
| >= `1.8.0`| >= `2.4.0`|
|`1.7.0`|`2.0.0 ~ 2.3.8`|

## Features

- `HMR`
- `Friendly error message` - browser and terminal

## Pre-installed

- [rust](https://www.rust-lang.org/learn/get-started)
- [nodejs](https://nodejs.org)
- [wasm-pack](https://github.com/rustwasm/wasm-pack)
- [rsw-rs](https://github.com/lencx/rsw-rs): `rsw = rs(rust) → w(wasm)` - A command-line tool for automatically rebuilding local changes, based on the wasm-pack implementation.

## Usage

### Step 1

Install rsw

```bash
cargo install rsw
```

Install vite-plugin-rsw

```bash
# With NPM:
npm i -D vite-plugin-rsw

# With Yarn:
yarn add -D vite-plugin-rsw
```

### Step 2

Edit vite.config.ts

```js
import { defineConfig } from 'vite';
import { ViteRsw } from 'vite-plugin-rsw';

export default defineConfig({
  plugins: [
    ViteRsw(),
  ],
})
```

### Step 3

Edit package.json

```json5
"scripts": {
+   "dev": "rsw watch & vite",
+   "build": "rsw build && tsc && vite build",
+   "rsw": "rsw"
}
```

### Step 4

[rsw.toml options](https://github.com/rwasm/rsw-rs#options)

1. Initial rsw.toml

   ```bash
   # yarn rsw -h
   yarn rsw init
   ```

2. Generate rust crate

   ```bash
   # rsw.toml
   [new]
   # using: wasm-pack | rsw | user, default is `wasm-pack`
   using = "wasm-pack"
   ```

   ```bash
   yarn rsw new rsw-hello
   ```

3. Edit rsw.toml

   ```toml
   # link type: npm | yarn | pnpm, default is `npm`
   cli = "npm"

   [[crates]]
   name = "rsw-hello"
   # <npm|yarn|pnpm> link
   # ⚠️ Note: must be set to `true`, default is `false`
   link = true
   ```

### Step 5

Start dev server

```bash
# rsw watch & vite
yarn dev
```

### Step 6

Deploy

```bash
yarn build
```

### Example

- [WA+](https://github.com/lencx/WA) - 🤩 Making a web page more like a desktop application is just the beginning, the possibilities are unlimited, up to your imagination!
- [Demo](https://github.com/lencx/learn-wasm) - 🎲 Learning WebAssembly
- [Oh My Box](https://github.com/lencx/OhMyBox) - 🔮 Development toolbox, and more...

## Related

[create-mpl](https://github.com/lencx/create-mpl) - ⚡️ Create a project in seconds!

```bash
# Quickly initialize a wasm project

# npm 6.x
npm init mpl@latest my-app --type wasm

# npm 7+, extra double-dash is needed:
npm init mpl@latest my-app -- --type wasm
```

---

## 微信

> 群二维码已过期，关注公众号《浮之静》，发送“进群”，我将拉你进群一起学习。

<img height="180" src="./assets/wasm-qrcode.png" alt="wasm-wechat-qrcode" /> <img height="160" src="./assets/fzj-qrcode.png" alt="fzj-qrcode" />

## License

MIT License © 2021 [lencx](https://github.com/lencx)
