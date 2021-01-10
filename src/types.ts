/**
 * Plugin options.
 */
export interface RswConfig {
  mode?: 'dev' | 'release';
  target?: 'web' | 'bundler' | 'nodejs' | 'no-modules'
}

export interface WasmOptions {
  path: string;
  outName?: string;
  scope?: string;
}

export interface RswPluginOptions extends RswConfig {
  crates: WasmOptions[];
}