import os from 'os';
import fs from 'fs';
import path from 'path';
import which from 'which';
import debug from 'debug';
import chalk from 'chalk';
import { execFileSync } from 'child_process';
import { RswCrateOptions } from './types';

const nodeBin = process.argv[0];

export const sleep = (time: number) => execFileSync(nodeBin, ['-e', `setTimeout(function() {}, ${time});`]);

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
