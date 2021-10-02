import type { ViteDevServer } from 'vite';

export type NpmCmdType = 'install' | 'link' | 'unlink';

export type CliType = 'npm' | 'pnpm';

// feat: https://github.com/lencx/vite-plugin-rsw/issues/22
export type RswCrateOptions = {
  // support `--out-name` and `scope`
  name: string;
  // `--out-dir`
  outDir?: string;
  // defalut: 'web'
  target?: 'bundler' | 'web' | 'nodejs' | 'deno' | 'no-modules';
  // no default value
  mode?: 'no-install' | 'normal';
  // extra options
  extraOpts?: string[];
  // https://github.com/lencx/vite-plugin-rsw/issues/24
  // when crate is built in a watched directory,
  // stop watching files, directories, or glob patterns, takes an array of strings.
  unwatch?: string[];
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
  // stop watching files, directories, or glob patterns, takes an array of strings
  unwatch?: string[];
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

export type watchOptions = {
  paths: string[];
  unwatch: string[];
  type: 'repo' | 'crate' | 'deps';
  callback: (path: string) => void;
}
