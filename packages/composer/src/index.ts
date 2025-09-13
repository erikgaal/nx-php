import {
  CreateNodesContext,
  CreateNodesFunction,
  CreateNodesResult,
  ProjectConfiguration,
  workspaceRoot,
} from '@nx/devkit';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, dirname, basename } from 'path';

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

/**
 * Recursively scans for composer.json files in the workspace
 */
function findComposerProjects(directory: string): string[] {
  const composerFiles: string[] = [];
  
  try {
    const entries = readdirSync(directory);
    
    for (const entry of entries) {
      const fullPath = join(directory, entry);
      const stats = statSync(fullPath);
      
      if (stats.isDirectory()) {
        // Skip node_modules and other common directories to avoid false positives
        if (!['node_modules', '.git', 'dist', 'tmp', '.nx'].includes(entry)) {
          composerFiles.push(...findComposerProjects(fullPath));
        }
      } else if (entry === 'composer.json') {
        composerFiles.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore directories we can't read
  }
  
  return composerFiles;
}

/**
 * Parses a composer.json file and extracts relevant metadata
 */
function parseComposerJson(filePath: string): ComposerJson | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as ComposerJson;
  } catch (error) {
    console.warn(`Failed to parse ${filePath}:`, error);
    return null;
  }
}

/**
 * Determines the project type based on composer.json metadata
 */
function getProjectType(composerJson: ComposerJson): 'library' | 'application' {
  // If it has a 'type' field in composer.json, respect it
  if (composerJson.type === 'library') {
    return 'library';
  }
  
  // If it has scripts that suggest it's an application (like serve, start)
  const scripts = composerJson.scripts || {};
  const appScripts = ['serve', 'start', 'dev', 'watch'];
  if (appScripts.some(script => script in scripts)) {
    return 'application';
  }
  
  // Default to library
  return 'library';
}

/**
 * Creates an Nx project configuration for a Composer project
 */
function createProjectConfiguration(
  composerJsonPath: string,
  composerJson: ComposerJson,
  configFilePath: string
): ProjectConfiguration {
  // Use the configFilePath (relative path) to determine the project root
  const projectRoot = configFilePath === 'composer.json' ? '.' : dirname(configFilePath);
  const projectName = composerJson.name || basename(projectRoot);
  const projectType = getProjectType(composerJson);
  
  const config: ProjectConfiguration = {
    name: projectName,
    root: projectRoot,
    projectType,
    sourceRoot: projectRoot,
    tags: ['php', 'composer'],
  };

  // Add targets based on available composer scripts
  const targets: Record<string, any> = {};
  
  if (composerJson.scripts) {
    for (const [scriptName, scriptCommand] of Object.entries(composerJson.scripts)) {
      targets[scriptName] = {
        executor: '@nx/workspace:run-commands',
        options: {
          command: `composer ${scriptName}`,
          cwd: projectRoot,
        },
      };
    }
  }

  // Add default composer targets
  targets.install = {
    executor: '@nx/workspace:run-commands',
    options: {
      command: 'composer install',
      cwd: projectRoot,
    },
  };

  targets.update = {
    executor: '@nx/workspace:run-commands',
    options: {
      command: 'composer update',
      cwd: projectRoot,
    },
  };

  if (Object.keys(targets).length > 0) {
    config.targets = targets;
  }

  return config;
}

/**
 * Nx CreateNodes function for Composer project discovery
 */
export const createNodes: CreateNodesFunction = (
  configFilePath: string,
  options: any,
  context: CreateNodesContext
) => {
  const composerJsonPath = join(context.workspaceRoot, configFilePath);
  
  // Only process composer.json files
  if (!configFilePath.endsWith('composer.json')) {
    return {};
  }

  const composerJson = parseComposerJson(composerJsonPath);
  if (!composerJson) {
    return {};
  }

  const projectConfig = createProjectConfiguration(composerJsonPath, composerJson, configFilePath);
  
  const result: CreateNodesResult = {
    projects: {
      [projectConfig.root]: projectConfig,
    },
  };

  return result;
};

/**
 * Plugin configuration
 */
export const ComposerPlugin = {
  name: '@nx-php/composer',
  createNodes: ['{**/composer.json,composer.json}', createNodes],
};

// Export the plugin as default
export default ComposerPlugin;
