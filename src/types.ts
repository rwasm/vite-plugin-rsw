export interface RswConfig {
  mode?: 'dev' | 'release';
  target?: 'web' | 'bundler' | 'nodejs' | 'no-modules'
}

export interface RswWasmOptions {
  path: string;
  pkgName?: string;
  outName?: string;
  scope?: string;
}

// Plugin options
export interface RswPluginOptions extends RswConfig {
  crates: RswWasmOptions[];
}

export interface RswCompileOptions {
  root?: string;
  sync?: boolean;
  crate?: RswWasmOptions;
}