import {
  CreateNodesContext,
  CreateNodesFunction,
  CreateNodesResult,
  ProjectConfiguration,
  workspaceRoot,
} from '@nx/devkit';
import { readFileSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { ComposerJson } from './models/composer-json';

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
 * Plugin configuration using createNodesV2 for Nx 21+
 */
const plugin = {
  name: '@nx-php/composer',
  createNodesV2: [
    '{**/composer.json,composer.json}',
    (configFiles: readonly string[], options: any, context: CreateNodesContext) => {
      return configFiles.map((configFile) => {
        const result = createNodes(configFile, options, context);
        return [configFile, result];
      });
    },
  ],
};

export default plugin;
