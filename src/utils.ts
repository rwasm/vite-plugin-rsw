import os from 'os';
import fs from 'fs';
import path from 'path';
import which from 'which';
import debug from 'debug';
import chalk from 'chalk';
import { RswCrateOptions } from './types';

export const debugRsw = debug('rsw');

export const isWin = os.platform() === 'win32';
export const userRoot = process.env.HOME || '';

export const wpCmd = () => isWin ? 'wasm-pack.exe' : 'wasm-pack';

export const npmCmd = () => isWin ? 'npm.cmd' : 'npm';

export const getCrateName = (crate: string | RswCrateOptions): string => (
  typeof crate === 'object' ? crate.name : crate
);

export const getCratePath = (crate: string | RswCrateOptions, crateRoot: string): string => {
  const _name = (crate as RswCrateOptions).name;
  const _root = path.join(crateRoot, _name ? _name : (crate as string));
  if (typeof crate === 'object' && crate.outDir) {
    if (new RegExp(`^${userRoot.replace('/', '\\/')}`).test(crate.outDir)) {
      return crate.outDir;
    }
    if (!crate.outDir.startsWith('/')) {
      return path.resolve(_root, crate.outDir);
    } else {
      console.log(
        chalk.bold.red('[rsw::error]'),
        chalk.red('Invalid outDir ~> Please use `path.resolve` or relative path.'),
        chalk.red(`\n\`${JSON.stringify(crate, null, 2)}\`\n`),
      );
      process.exit();
    }
  }

  return path.resolve(_root, 'pkg');
};

export function checkENV() {
  const wasmPack = which.sync('wasm-pack', { nothrow: true });
  if (!wasmPack) {
    console.log(
      chalk.bold.red('[rsw::error]'),
      chalk.red('Cannot find wasm-pack in your PATH. Please make sure wasm-pack is installed.'),
    );
    console.log(
      chalk.bold.gray('[rsw::INFO]'),
      'wasm-pack install:',
      chalk.green('https://github.com/rustwasm/wasm-pack'),
    );
  }
}

export function checkMtime(
  dirs: string,
  cargoToml: string,
  benchmarkFile: string,
  runCallback: Function,
  optimCallback: Function,
) {
  try {
    // benchmark file modified time
    const pkgMtime = fs.statSync(benchmarkFile).mtimeMs;
    const cargoMtime = fs.statSync(cargoToml).mtimeMs;
    let isOptim = true;

    // run wasm-pack
    if (cargoMtime > pkgMtime) {
      isOptim = false;
      return runCallback();
    }

    (function dirsMtime(dir) {
      for (let f of fs.readdirSync(dir)) {
        const _f = fs.statSync(`${dir}/${f}`);

        if (_f.isDirectory()) {
          if (_f.mtimeMs > pkgMtime) {
            // run wasm-pack
            isOptim = false;
            runCallback();
            break;
          } else {
            dirsMtime(`${dir}/${f}`)
          }
        }

        if (_f.isFile()) {
          if (_f.mtimeMs > pkgMtime) {
            // run wasm-pack
            isOptim = false;
            runCallback();
            break;
          }
        }
      }
    })(dirs)

    isOptim && optimCallback();
  } catch(e) {
    // no such file or directory
    runCallback();
  }
}

// load wasm: fetch or URL
export function loadWasm(code: string, oPath: string, nPath: string) {
  console.log(
    chalk.bold.blue('\n[rsw::build]'),
    chalk.yellow(oPath),
    `~>`,
    chalk.green(nPath),
  );
  code = code.replace(/import\.meta\.url\.replace\(\/\\\\\.js\$\/, \\'_bg\.wasm\\'\);/, `fetch('${nPath}')`);
  code = code.replace(`new URL('${oPath}',`, `new URL('${nPath}',`);
  code = code.replace(/, import\.meta\.url\)/, `, location.origin)`);
  return code;
}

export function genLibs(src: string, dest: string) {
  const srcExists = fs.existsSync(src);
  if (!srcExists) return;

  dest = dest.startsWith('/') ? dest.substring(1) : dest;
  const exists = fs.existsSync(dest);
  const _dest = dest.split('/');
  if (exists) {
    fs.rmdirSync(_dest[0], { recursive: true });
  }

  fs.mkdirSync(dest, { recursive: true });

  const pkgInfo = fs.readFileSync(`${src}/package.json`, 'utf8');
  const pkgJson = JSON.parse(pkgInfo);
  const wasmFile = pkgJson.module.replace('.js', '_bg.wasm');
  const pkgName = pkgJson.name;

  fs.readdirSync(src).forEach((file) => {
    switch (true) {
      case file === '.gitignore': return;
      case file === 'package-lock.json': return;
      case file === pkgJson.module: {
        let code = fs.readFileSync(`${src}/${file}`, 'utf8');
        if (code) {
          code = loadWasm(code, wasmFile, wasmFile);
          fs.writeFileSync(`${dest}/${file}`, code);
          console.log(chalk.greenBright(`  ↳ ${pkgName}`));
        }
        return;
      }
      default: fs.copyFileSync(`${src}/${file}`, `${dest}/${file}`);
    }
  });
}

export function fmtMsg(content: string, isTag: boolean = false) {
  return content.split('\n').map((line) => {
    /**
     *   Compiling crate
     *  -->
     * 2 | code
     *   = note:
     * warning:
     * error:
     * help:
     */
    if (isTag) {
      return line.replace(/(^\s+-->|\s+\=(\snote)?|[\s\d]+\|)/, `<code class="rsw-line">$1</code>`)
        .replace(/(^\s+Compiling)/, `<code class="rsw-green">$1</code>`)
        .replace(/(^warning)/, `<code class="rsw-warn">$1</code>`)
        .replace(/(^error)/, `<code class="rsw-error">$1</code>`)
        .replace(/(^help)/, `<code class="rsw-help">$1</code>`);
    }
    return line.replace(/(^\s+-->|\s+\=(\snote)?|[\s\d]+\|)/, chalk.blue('$1'))
      .replace(/(^\s+Compiling)/, chalk.bold.green('$1'))
      .replace(/(^warning)/, chalk.bold.yellow('$1'))
      .replace(/(^error)/, chalk.bold.red('$1'))
      .replace(/(^help)/, chalk.bold.cyan('$1'));
  }).join('\n');
}

export const rswHot = `
if (import.meta.hot) {
  import.meta.hot.on('rsw-error', (data) => {
    createRswErrorOverlay(data);
    throw \`\n🦀\${data.plugin} ~> \${data.id}\n\n\${data.console}\`
  })
  import.meta.hot.on('rsw-error-close', (data) => {
    window.location.reload();
  })
}`;

export const rswOverlay = `
const rswTemplate = \`
<style>
:host {
  position: fixed;
  z-index: 99999;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  margin: 0;
  background: rgba(0, 0, 0, 0.66);
  --monospace: 'SFMono-Regular', Consolas,
              'Liberation Mono', Menlo, Courier, monospace;
  --red: #ff5555;
  --green: #26cb7c;
  --yellow: #e2aa53;
  --purple: #cfa4ff;
  --cyan: #2dd9da;
  --dim: #c9c9c9;
  --blue: #3884ff;
}
.window {
  font-family: var(--monospace);
  line-height: 1.5;
  width: 800px;
  color: #d8d8d8;
  margin: 30px auto;
  padding: 25px 40px;
  position: relative;
  background: #181818;
  border-radius: 6px 6px 8px 8px;
  box-shadow: 0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22);
  overflow: hidden;
  border-top: 8px solid var(--red);
}
pre {
  font-family: var(--monospace);
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 1em;
  overflow-x: scroll;
  scrollbar-width: none;
}
pre::-webkit-scrollbar {
  display: none;
}
.message {
  line-height: 1.3;
  white-space: pre-wrap;
  color: #6d7878;
  font-size: 14px;
}
.plugin {
  color: var(--purple);
  font-weight: bold;
}
.file {
  color: var(--green);
  margin: 8px 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 14px;
  font-weight: bold;
  text-decoration: underline;
  cursor: pointer;
}
.tip {
  font-size: 13px;
  color: #999;
  border-top: 1px dotted #999;
  padding-top: 13px;
}
code {
  font-size: 13px;
  font-family: var(--monospace);
  font-weight: bold;
}
.rsw-line {
  color: var(--blue);
}
.rsw-green {
  color: var(--green);
}
.rsw-error {
  color: var(--red);
}
.rsw-warn {
  color: var(--yellow);
}
.rsw-help {
  color: var(--cyan);
}
.file-link {
  text-decoration: underline;
  cursor: pointer;
}
</style>
<div class="window">
  <span class="plugin"></span>
  <pre class="file"></pre>
  <pre class="message"></pre>
  <div class="tip">
    [rsw::error] This error occurred during the build time, click outside or fix the code to dismiss.
  </div>
</div>
\`;

class RswErrorOverlay extends HTMLElement {
  constructor(payload) {
    super()
    this.root = this.attachShadow({ mode: 'open' });
    this.root.innerHTML = rswTemplate;
    this.text('.message', payload.message.trim());
    this.text('.plugin', payload.plugin.trim());
    this.text('.file', payload.id.trim());

    this.root.querySelector('.window').addEventListener('click', (e) => {
      e.stopPropagation();
    });
    this.addEventListener('click', () => {
      this.close();
    });
  }

  text(selector, text) {
    const el = this.root.querySelector(selector);
    if (el) el.innerHTML = text;
  }

  close() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }
}

const overlayRswId = 'vite-rsw-error-overlay';
if (!customElements.get(overlayRswId)) {
  customElements.define(overlayRswId, RswErrorOverlay);
}

function createRswErrorOverlay(err) {
  clearRswErrorOverlay();
  document.body.appendChild(new RswErrorOverlay(err));
}

function clearRswErrorOverlay() {
  document
    .querySelectorAll(overlayRswId)
    .forEach((n) => n.close());
}

window.createRswErrorOverlay = createRswErrorOverlay;
`;
