// Plugin options
export interface RswConfig {
  root?: string; // default: project root
  mode?: 'dev' | 'release';
  target?: 'web' | 'bundler' | 'nodejs' | 'no-modules';
}

export type RswCrateOptions = {
  name: string;
}

export interface RswPluginOptions extends RswConfig {
  crates: Array<string|RswCrateOptions>;
}
