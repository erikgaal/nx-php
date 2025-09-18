import {
  CreateNodesV2,
  CreateNodesFunctionV2,
  CreateNodesContextV2,
  CreateNodesResult,
  CreateNodesResultV2,
  ProjectConfiguration,
  TargetConfiguration,
  logger,
} from '@nx/devkit';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

/**
 * PHPStan configuration file names to look for
 */
const PHPSTAN_CONFIG_FILES = [
  'phpstan.neon',
  'phpstan.neon.dist',
  'phpstan.json',
  'phpstan.json.dist',
  'phpstan.php',
  'phpstan.php.dist',
];

/**
 * Check if a directory contains a PHPStan configuration file
 */
function findPhpStanConfigFile(projectRoot: string, workspaceRoot: string): string | null {
  const fullProjectPath = resolve(workspaceRoot, projectRoot);
  
  for (const configFile of PHPSTAN_CONFIG_FILES) {
    const configPath = join(fullProjectPath, configFile);
    if (existsSync(configPath)) {
      return configFile;
    }
  }
  
  return null;
}

/**
 * Create PHPStan target configuration
 */
function createPhpStanTarget(configFile: string): TargetConfiguration {
  return {
    executor: 'nx:run-commands',
    options: {
      command: `vendor/bin/phpstan analyze --configuration=${configFile}`,
    },
    inputs: [
      '{projectRoot}/**/*.php',
      `{projectRoot}/${configFile}`,
      '{projectRoot}/composer.json',
      '{projectRoot}/composer.lock',
    ],
    outputs: [],
    cache: true,
  };
}

/**
 * Generate project name from directory path
 */
function generateProjectName(projectRoot: string): string {
  // Use the directory name as project name, replacing path separators with dashes
  return projectRoot.replace(/[/\\]/g, '-');
}

/**
 * Create nodes function for discovering PHPStan projects
 */
const createNodesFunction: CreateNodesFunctionV2 = (
  configFilePaths: readonly string[],
  options: undefined,
  context: CreateNodesContextV2
): CreateNodesResultV2 => {
  const results: [string, CreateNodesResult][] = [];

  // Group config files by their directory to avoid duplicate projects
  const projectDirs = new Set<string>();
  const configFilesByDir = new Map<string, string[]>();

  for (const configFilePath of configFilePaths) {
    const projectRoot = dirname(configFilePath);
    if (!projectDirs.has(projectRoot)) {
      projectDirs.add(projectRoot);
      configFilesByDir.set(projectRoot, []);
    }
    configFilesByDir.get(projectRoot)?.push(configFilePath);
  }

  // Create a project for each directory that contains PHPStan config files
  for (const projectRoot of projectDirs) {
    const configFile = findPhpStanConfigFile(projectRoot, context.workspaceRoot);
    
    if (!configFile) {
      // No PHPStan config found, skip this directory
      continue;
    }

    try {
      const projectName = generateProjectName(projectRoot);
      const phpstanTarget = createPhpStanTarget(configFile);

      const projectConfig: ProjectConfiguration = {
        name: projectName,
        root: projectRoot,
        projectType: 'library',
        targets: {
          phpstan: phpstanTarget,
        },
        tags: ['phpstan'],
      };

      // Use the first config file path from this directory for the result key
      const configFiles = configFilesByDir.get(projectRoot);
      if (!configFiles || configFiles.length === 0) {
        continue;
      }
      const resultKey = configFiles[0];
      results.push([resultKey, {
        projects: {
          [projectRoot]: projectConfig,
        },
      }]);
    } catch (error) {
      logger.warn(`Failed to create PHPStan project configuration for ${projectRoot}: ${error}`);
      // Add empty result to maintain consistent return structure
      const configFiles = configFilesByDir.get(projectRoot);
      if (configFiles && configFiles.length > 0) {
        const resultKey = configFiles[0];
        results.push([resultKey, {}]);
      }
    }
  }

  return results;
};

/**
 * The createNodes configuration for the PHPStan plugin
 */
export const createNodesV2: CreateNodesV2 = [
  `**/{${PHPSTAN_CONFIG_FILES.join(',')}}`,
  createNodesFunction,
] as const;