export interface ComposerJson {
  name?: string;
  type?: 'library' | 'project' | 'metapackage' | 'composer-plugin';
  description?: string;
  keywords?: string[];
  require?: Record<string, string>;
  'require-dev'?: Record<string, string>;
  autoload?: {
    'psr-4'?: Record<string, string>;
    'psr-0'?: Record<string, string>;
    files?: string[];
    classmap?: string[];
  };
  scripts?: Record<string, string | string[]>;
}