import type { ViteDevServer } from 'vite';

export type RswCrateOptions = {
  name: string;
  // other wasm-pack options
}

export type WasmFileInfo = {
  fileName: string;
  source: string | false | undefined | Uint8Array;
}

export interface RswConfig {
  root?: string; // default: project root
  mode?: 'dev' | 'release';
  target?: 'web' | 'bundler' | 'nodejs' | 'no-modules';
}

// Plugin options
export interface RswPluginOptions extends RswConfig {
  unLinks?: Array<string|RswCrateOptions>;
  isLib?: boolean;
  libRoot?: string;
  crates: Array<string|RswCrateOptions>;
}

export type CompileOneOptions = {
  config: RswConfig;
  crate: string | RswCrateOptions;
  sync: boolean;
  serve?: ViteDevServer;
  filePath?: string;
  root?: string;
}

export type NpmCmdType = 'install' | 'link' | 'unlink';

export type RswCompileOptions = {
  config: RswPluginOptions;
  root: string;
  crate?: string;
  serve?: ViteDevServer;
  filePath?: string;
  npmType?: NpmCmdType;
}