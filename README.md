# vite-plugin-rsw

> wasm-pack plugin for vite@v2

## Features

- mode: `development build` or `release build`
- multiple rust crate
  - compile
  - hot-update

## Quick Start

```bash
# more: https://github.com/lencx/create-xc-app
npx create-xc-app my-app --template wasm-react
```

## Getting Started

### Step1

```bash
# install rsw
npm i -D vite-plugin-rsw

# or
yarn add -D vite-plugin-rsw
```

```js
// vite.config.ts
import { defineConfig } from "vite";
import ViteRsw from "vite-plugin-rsw";

export default defineConfig({
  plugins: [
    ViteRsw({
      mode: "release",
      crates: ["@rsw/hey", "rsw-test"],
    }),
  ],
});
```

### Step2

```bash
cargo new --lib <crate_name>
```

```toml
# Cargo.toml

[lib]
crate-type = ["cdylib"]
wasm-opt = false

[profile.release]
lto = true
opt-level = 'z'

[dependencies]
wasm-bindgen = "0.2.69"
```

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

// Import the `window.alert` function from the Web.
#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

// Export a `greet` function from Rust to JavaScript, that alerts a hello message.
#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("Hello, {}!", name));
}
```

## Plugin Options

- `root`: rust crate root path. default project root path.
- `mode`
  - `dev`: create a development build. Enable debug info, and disable optimizations.
  - `release`: create a release build. Enable optimizations and disable debug info.
- `target`: sets the target environment.
  - `web`: default
  - `bundler`
  - `nodejs`
  - `no-modules`
- `crates`:
  - `string[]`: package name, support npm organization.

> **⚠️ Note:** Before performing the `vite build`, at least once `vite dev`, generate `wasm package (rust-crate/pkg)`. In the project, `wasm package` is installed by `vite-plugin-rsw` in the form of `npm link`, otherwise it will error `Can not find module 'rust-crate' or its corresponding type declarations.`

## 进微信群

![wasm-wechat](./assets/wasm-qrcode.png)

## License

MIT License © 2021 [lencx](https://github.com/lencx)
