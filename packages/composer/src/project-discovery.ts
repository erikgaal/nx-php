import {
  CreateNodesV2,
  CreateNodesFunctionV2,
  CreateNodesContextV2,
  CreateNodesResult,
  CreateNodesResultV2,
  ProjectConfiguration,
  logger,
  CreateDependencies,
  CreateDependenciesContext,
  RawProjectGraphDependency,
  DependencyType,
} from '@nx/devkit';
import { dirname, relative, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { ComposerJson } from './models/composer-json';

/**
 * Parse composer.json file and extract project metadata
 */
function parseComposerJson(composerJsonPath: string): ComposerJson | null {
  try {
    if (!existsSync(composerJsonPath)) {
      return null;
    }

    const content = readFileSync(composerJsonPath, 'utf-8');
    return JSON.parse(content) as ComposerJson;
  } catch (error) {
    logger.warn(`Failed to parse composer.json at ${composerJsonPath}: ${error}`);
    return null;
  }
}

/**
 * Generate project name from composer package name or directory path
 */
function generateProjectName(composerJson: ComposerJson, projectRoot: string, workspaceRoot: string): string {
  // Use composer package name if available
  if (composerJson.name) {
    // Replace slashes with hyphens for Nx project names
    return composerJson.name.replace('/', '-');
  }

  // Fall back to directory name relative to workspace root
  // projectRoot is already relative, so just use the last directory name
  // or the full relative path with slashes replaced with hyphens
  const relativePath = projectRoot.startsWith('/') ? relative(workspaceRoot, projectRoot) : projectRoot;
  return relativePath.replace(/[/\\]/g, '-');
}

/**
 * Determine project type based on composer.json metadata
 */
function getProjectType(composerJson: ComposerJson): 'library' | 'application' {
  // If it's explicitly marked as project, it's an application
  if (composerJson.type === 'project') {
    return 'application';
  }

  // Otherwise, map to library
  return 'library';
}

/**
 * Generate project configuration from composer.json
 */
function createProjectConfiguration(
  composerJson: ComposerJson,
  projectRoot: string,
  workspaceRoot: string
): ProjectConfiguration {
  const projectName = generateProjectName(composerJson, projectRoot, workspaceRoot);
  const projectType = getProjectType(composerJson);

  // Get relative path properly - projectRoot is already relative to workspaceRoot
  const relativeRoot = projectRoot.startsWith('/') ? relative(workspaceRoot, projectRoot) : projectRoot;

  // Default configuration
  const config: ProjectConfiguration = {
    root: relativeRoot,
    name: projectName,
    projectType,
    tags: [],
  };

  // Add source root based on autoload configuration
  if (composerJson.autoload?.['psr-4']) {
    const psr4Dirs = Object.values(composerJson.autoload['psr-4']);
    if (psr4Dirs.length > 0) {
      // Use the first PSR-4 directory as source root
      const srcDir = psr4Dirs[0].replace(/\/$/, ''); // Remove trailing slash
      config.sourceRoot = `${relativeRoot}/${srcDir}`.replace(/\\/g, '/');
    }
  } else {
    // Default source root
    config.sourceRoot = `${relativeRoot}/src`;
  }

  // Add tags based on composer metadata
  const tags: string[] = [];
  
  if (composerJson.type) {
    tags.push(`composer:${composerJson.type}`);
  }

  if (composerJson.keywords && composerJson.keywords.length > 0) {
    tags.push(...composerJson.keywords.map(keyword => `keyword:${keyword}`));
  }

  config.tags = tags;

  return config;
}

/**
 * Parse dependencies from composer.json
 */
function parseDependencies(composerJson: ComposerJson): { 
  require: Record<string, string>;
  requireDev: Record<string, string>;
} {
  return {
    require: composerJson.require || {},
    requireDev: composerJson['require-dev'] || {},
  };
}

/**
 * Check if a dependency name matches a workspace project name
 */
function findWorkspaceDependency(
  dependencyName: string, 
  projects: Record<string, ProjectConfiguration>
): string | null {
  // Direct name match (e.g., "vendor/package" -> "vendor-package")
  const normalizedDependencyName = dependencyName.replace('/', '-');
  
  // Check if any project has this name as their composer package name or project name
  for (const [projectRoot, project] of Object.entries(projects)) {
    // Check direct project name match
    if (project.name === normalizedDependencyName) {
      return project.name;
    }
    
    // Check if the dependency name matches any project's composer package name pattern
    // Extract package name part (after slash) and compare
    if (dependencyName.includes('/')) {
      const packagePart = dependencyName.split('/')[1];
      const packageNormalized = packagePart.replace(/[^a-zA-Z0-9]/g, '-');
      
      if (project.name === packageNormalized || project.name === packagePart) {
        return project.name;
      }
    }
    
    // Check if the project root matches (for projects without names)
    const normalizedProjectRoot = projectRoot.replace(/[/\\]/g, '-');
    if (normalizedProjectRoot === normalizedDependencyName) {
      return project.name || projectRoot;
    }
  }
  
  return null;
}

/**
 * Create dependencies function for adding project graph edges
 */
const createDependencies: CreateDependencies = (
  options: undefined,
  context: CreateDependenciesContext
): RawProjectGraphDependency[] => {
  const dependencies: RawProjectGraphDependency[] = [];
  
  // Process each project to find its composer.json and dependencies
  for (const [projectName, projectConfig] of Object.entries(context.projects)) {
    const composerJsonPath = resolve(context.workspaceRoot, projectConfig.root, 'composer.json');
    
    if (!existsSync(composerJsonPath)) {
      continue;
    }
    
    const composerJson = parseComposerJson(composerJsonPath);
    if (!composerJson) {
      continue;
    }
    
    const { require, requireDev } = parseDependencies(composerJson);
    
    // Process production dependencies
    for (const dependencyName of Object.keys(require)) {
      const workspaceDependency = findWorkspaceDependency(dependencyName, context.projects);
      if (workspaceDependency && workspaceDependency !== projectName) {
        dependencies.push({
          source: projectName,
          target: workspaceDependency,
          type: DependencyType.static,
          sourceFile: relative(context.workspaceRoot, composerJsonPath),
        });
      }
    }
    
    // Process development dependencies
    for (const dependencyName of Object.keys(requireDev)) {
      const workspaceDependency = findWorkspaceDependency(dependencyName, context.projects);
      if (workspaceDependency && workspaceDependency !== projectName) {
        dependencies.push({
          source: projectName,
          target: workspaceDependency,
          type: DependencyType.static,
          sourceFile: relative(context.workspaceRoot, composerJsonPath),
        });
      }
    }
  }
  
  return dependencies;
};

/**
 * Create nodes function for discovering Composer projects
 */
const createNodesFunction: CreateNodesFunctionV2 = (
  configFilePaths: readonly string[],
  options: undefined,
  context: CreateNodesContextV2
): CreateNodesResultV2 => {
  return configFilePaths.map((configFilePath): [string, CreateNodesResult] => {
    const projectRoot = dirname(configFilePath);
    const composerJsonPath = resolve(context.workspaceRoot, configFilePath);

    const composerJson = parseComposerJson(composerJsonPath);
    if (!composerJson) {
      return [configFilePath, {}];
    }

    try {
      const projectConfig = createProjectConfiguration(
        composerJson,
        projectRoot,
        context.workspaceRoot
      );

      return [configFilePath, {
        projects: {
          [projectRoot]: projectConfig,
        },
      }];
    } catch (error) {
      logger.warn(`Failed to create project configuration for ${configFilePath}: ${error}`);
      return [configFilePath, {}];
    }
  });
};

/**
 * The createNodes configuration for the Composer plugin
 */
export const createNodesV2: CreateNodesV2 = [
  '**/composer.json',
  createNodesFunction,
] as const;

/**
 * The createDependencies configuration for the Composer plugin
 */
export { createDependencies };