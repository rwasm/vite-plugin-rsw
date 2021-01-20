export type RswCrateOptions = {
  name: string;
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
  crates: Array<string|RswCrateOptions>;
}