import {
  CreateNodesV2,
  CreateNodesFunctionV2,
  CreateNodesContextV2,
  CreateNodesResult,
  CreateNodesResultV2,
  ProjectConfiguration,
  logger,
} from '@nx/devkit';
import { dirname, relative } from 'path';
import { existsSync } from 'fs';

/**
 * Common PHPUnit configuration file patterns
 */
const PHPUNIT_CONFIG_FILES = [
  'phpunit.xml',
  'phpunit.xml.dist',
  'phpunit.dist.xml',
  '.phpunit.xml',
  '.phpunit.xml.dist',
  'phpunit.config.xml',
];

/**
 * Check if a directory contains a PHPUnit configuration file
 */
function hasPHPUnitConfig(projectRoot: string, workspaceRoot: string): string | null {
  for (const configFile of PHPUNIT_CONFIG_FILES) {
    const configPath = `${workspaceRoot}/${projectRoot}/${configFile}`;
    if (existsSync(configPath)) {
      return configFile;
    }
  }
  return null;
}

/**
 * Create project configuration with phpunit target
 */
function createProjectConfiguration(
  projectRoot: string,
  configFile: string,
  workspaceRoot: string
): ProjectConfiguration {
  // Get relative path properly
  const relativeRoot = projectRoot.startsWith('/') ? relative(workspaceRoot, projectRoot) : projectRoot;
  const projectName = relativeRoot.replace(/[/\\]/g, '-');

  return {
    root: relativeRoot,
    name: projectName,
    targets: {
      phpunit: {
        executor: 'nx:run-commands',
        options: {
          command: `vendor/bin/phpunit --configuration ${configFile}`,
          cwd: relativeRoot,
        },
        metadata: {
          technologies: ['phpunit'],
          description: 'Run PHPUnit tests',
          help: {
            command: 'npx nx phpunit --help',
            example: {
              options: {
                '--coverage-text': 'Generate text coverage report',
                '--filter': 'Run only tests matching the given pattern',
                '--group': 'Run tests from the specified group(s)',
                '--testsuite': 'Run tests from the specified test suite',
              },
            },
          },
        },
      },
    },
    tags: ['phpunit'],
  };
}

/**
 * Create nodes function for PHPUnit configurations
 */
const createNodesFunction: CreateNodesFunctionV2<Record<string, unknown>> = (
  configFiles: readonly string[],
  options: Record<string, unknown> | undefined,
  context: CreateNodesContextV2
): CreateNodesResultV2 => {
  return configFiles.map((configFile): [string, CreateNodesResult] => {
    const projectRoot = dirname(configFile);
    
    // Check if this directory has a PHPUnit config
    const phpunitConfigFile = hasPHPUnitConfig(projectRoot, context.workspaceRoot);
    if (!phpunitConfigFile) {
      return [configFile, {}];
    }

    try {
      const projectConfiguration = createProjectConfiguration(
        projectRoot,
        phpunitConfigFile,
        context.workspaceRoot
      );

      return [
        configFile,
        {
          projects: {
            [projectConfiguration.root!]: projectConfiguration,
          },
        },
      ];
    } catch (error) {
      logger.warn(`Failed to create project configuration for ${configFile}: ${error}`);
      return [configFile, {}];
    }
  });
};

/**
 * Nx plugin configuration for PHPUnit project discovery
 */
export const createNodesV2: CreateNodesV2<Record<string, unknown>> = [
  // Pattern to match any directory that might contain PHPUnit config
  // We use a broad pattern and filter in the function
  '**/composer.json',
  createNodesFunction,
];