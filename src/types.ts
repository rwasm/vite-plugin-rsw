import type { ViteDevServer } from 'vite';

export type NpmCmdType = 'install' | 'link' | 'unlink';

export type CliType = 'npm' | 'pnpm';

export type RswCrateOptions = {
  name: string;
  outDir?: string;
  // other wasm-pack options
}

export type WasmFileInfo = {
  fileName: string;
  source: string | false | undefined | Uint8Array;
}

export type BaseRswConfig = {
  root?: string; // default: project root
  // feat: https://github.com/lencx/vite-plugin-rsw/issues/14
  cli?: CliType; // default: npm
  unLinks?: Array<string|RswCrateOptions>;
}

// Plugin options
export type RswPluginOptions = BaseRswConfig & {
  crates: Array<string|RswCrateOptions>;
}

export type CompileOneOptions = {
  config: BaseRswConfig;
  crate: string | RswCrateOptions;
  sync: boolean;
  serve?: ViteDevServer;
  filePath?: string;
  root?: string;
  outDir?: string;
}

export type RswCompileOptions = {
  config: RswPluginOptions;
  root: string;
  crate?: string;
  serve?: ViteDevServer;
  filePath?: string;
  npmType?: NpmCmdType;
  cratePathMap?: Map<string, string>;
}