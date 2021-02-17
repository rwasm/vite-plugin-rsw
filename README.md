# vite-plugin-rsw

> wasm-pack plugin for vite@v2

## Pre-installed

* [rust](https://www.rust-lang.org/learn/get-started)
* [nodejs](https://nodejs.org)
* [wasm-pack](https://github.com/rustwasm/wasm-pack)

## Features

* mode: `development build` or `release build`
* multiple rust crate
  * compile
  * hot-update

## Quick Start

```bash
# more: https://github.com/lencx/create-xc-app
npx create-xc-app my-react-wasm --template wasm-react
# or
npx create-xc-app my-vue-wasm --template wasm-vue
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

# https://github.com/rustwasm/wasm-pack/issues/886
# https://developers.google.com/web/updates/2019/02/hotpath-with-wasm
[package.metadata.wasm-pack.profile.release]
wasm-opt = false

# See more keys and their definitions at https://doc.rust-lang.org/cargo/reference/manifest.html
[lib]
crate-type = ["cdylib", "rlib"]

[profile.release]
lto = true
opt-level = "s"

[dependencies]
wasm-bindgen = "0.2.70"
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

<!-- * `root`: rust crate root path. default project root path. -->
* `mode`
  * `dev`: create a development build. Enable debug info, and disable optimizations.
  * `release`: create a release build. Enable optimizations and disable debug info.
* `target`: sets the target environment.
  * `web`: default
  * `bundler`
  * `nodejs`
  * `no-modules`
* `crates`:
  * `string[]`: package name, support npm organization.

> **⚠️ Note:** Before performing the `vite build`, at least once `vite dev`, generate `wasm package (rust-crate/pkg)`. In the project, `wasm package` is installed by `vite-plugin-rsw` in the form of `npm link`, otherwise it will error `Can not find module 'rust-crate' or its corresponding type declarations.`

## Examples

* [react](https://github.com/lencx/vite-plugin-rsw/tree/main/examples/react)
* [vue3](https://github.com/lencx/vite-plugin-rsw/tree/main/examples/vue3)
* [learn-wasm](https://github.com/lencx/learn-wasm)

## Related List

* [WebAssembly入门](https://mtc.nofwl.com/tech/post/wasm-start.html)
* [Awesome WebAssembly](https://mtc.nofwl.com/awesome/wasm.html)

## 微信

> 群二维码已过期，关注公众号《浮之静》，发送“进群”，我将拉你进群一起学习。

<img height="200" src="./assets/wasm-qrcode.png" alt="wasm-wechat-qrcode" /> <img height="180" src="./assets/fzj-qrcode.png" alt="fzj-qrcode" />

## License

MIT License © 2021 [lencx](https://github.com/lencx)
