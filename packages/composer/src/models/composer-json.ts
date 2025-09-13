export interface ComposerJson {
  name?: string;
  type?: string;
  description?: string;
  version?: string;
  require?: Record<string, string>;
  'require-dev'?: Record<string, string>;
  autoload?: {
    'psr-4'?: Record<string, string>;
    classmap?: string[];
    files?: string[];
  };
  scripts?: Record<string, string>;
}