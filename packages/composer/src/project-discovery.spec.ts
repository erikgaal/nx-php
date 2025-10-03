import { CreateNodesContextV2, CreateDependenciesContext } from '@nx/devkit';
import { createNodesV2 } from './project-discovery';
import { vol } from 'memfs';

// Mock fs to use memfs for testing
jest.mock('fs', () => ({
  ...jest.requireActual('memfs').fs,
}));

describe('project-discovery', () => {
  let mockContext: CreateNodesContextV2;
  const workspaceRoot = '/workspace';

  beforeEach(() => {
    vol.reset();
    mockContext = {
      nxJsonConfiguration: {},
      workspaceRoot,
    };
  });

  const [pattern, createNodesFunction] = createNodesV2;

  it('should match composer.json files', () => {
    expect(pattern).toBe('**/composer.json');
  });

  it('should parse basic composer.json and create project configuration', () => {
    const composerJson = {
      name: 'vendor/package',
      type: 'library',
      description: 'A test package',
      require: {
        'php': '^8.0',
      },
    };

    vol.fromJSON({
      '/workspace/packages/my-lib/composer.json': JSON.stringify(composerJson),
    });

    const results = createNodesFunction(['packages/my-lib/composer.json'], undefined, mockContext);
    const [configFile, result] = results[0];
    
    expect(configFile).toBe('packages/my-lib/composer.json');
    expect(result.projects).toHaveProperty('packages/my-lib');
    const project = result.projects!['packages/my-lib'];
    
    expect(project.name).toBe('vendor-package');
    expect(project.projectType).toBe('library');
    expect(project.root).toBe('packages/my-lib');
    expect(project.sourceRoot).toBe('packages/my-lib/src');
    expect(project.tags).toContain('composer:library');
  });

  it('should detect application type for project type', () => {
    const composerJson = {
      name: 'my/app',
      type: 'project',
    };

    vol.fromJSON({
      '/workspace/my-app/composer.json': JSON.stringify(composerJson),
    });

    const results = createNodesFunction(['my-app/composer.json'], undefined, mockContext);
    const [, result] = results[0];

    expect(result.projects).toHaveProperty('my-app');
    const project = result.projects!['my-app'];
    
    expect(project.projectType).toBe('application');
  });

  it('should detect library type for non-project types', () => {
    const composerJson = {
      name: 'my/lib',
      type: 'library',
    };

    vol.fromJSON({
      '/workspace/my-lib/composer.json': JSON.stringify(composerJson),
    });

    const results = createNodesFunction(['my-lib/composer.json'], undefined, mockContext);
    const [, result] = results[0];

    expect(result.projects).toHaveProperty('my-lib');
    const project = result.projects!['my-lib'];
    
    expect(project.projectType).toBe('library');
  });

  it('should create project name from directory when no name is specified', () => {
    const composerJson = {
      type: 'library',
    };

    vol.fromJSON({
      '/workspace/packages/some-lib/composer.json': JSON.stringify(composerJson),
    });

    const results = createNodesFunction(['packages/some-lib/composer.json'], undefined, mockContext);
    const [, result] = results[0];

    expect(result.projects).toHaveProperty('packages/some-lib');
    const project = result.projects!['packages/some-lib'];
    
    expect(project.name).toBe('packages-some-lib');
  });

  it('should configure source root based on PSR-4 autoload', () => {
    const composerJson = {
      name: 'test/package',
      autoload: {
        'psr-4': {
          'Test\\Package\\': 'lib/',
        },
      },
    };

    vol.fromJSON({
      '/workspace/test-package/composer.json': JSON.stringify(composerJson),
    });

    const results = createNodesFunction(['test-package/composer.json'], undefined, mockContext);
    const [, result] = results[0];

    expect(result.projects).toHaveProperty('test-package');
    const project = result.projects!['test-package'];
    
    expect(project.sourceRoot).toBe('test-package/lib');
  });

  it('should not create default targets', () => {
    const composerJson = {
      name: 'test/package',
    };

    vol.fromJSON({
      '/workspace/test-package/composer.json': JSON.stringify(composerJson),
    });

    const results = createNodesFunction(['test-package/composer.json'], undefined, mockContext);
    const [, result] = results[0];

    expect(result.projects).toHaveProperty('test-package');
    const project = result.projects!['test-package'];
    
    // Should not have any targets by default
    expect(project.targets).toBeUndefined();
  });

  it('should not add test target even when phpunit is in require-dev', () => {
    const composerJson = {
      name: 'test/package',
      'require-dev': {
        'phpunit/phpunit': '^9.0',
      },
    };

    vol.fromJSON({
      '/workspace/test-package/composer.json': JSON.stringify(composerJson),
    });

    const results = createNodesFunction(['test-package/composer.json'], undefined, mockContext);
    const [, result] = results[0];

    expect(result.projects).toHaveProperty('test-package');
    const project = result.projects!['test-package'];
    
    // Should not have any targets including test
    expect(project.targets).toBeUndefined();
  });

  it('should not add test target even with test scripts', () => {
    const composerJson = {
      name: 'test/package',
      scripts: {
        test: 'vendor/bin/phpunit --coverage-clover coverage.xml',
      },
    };

    vol.fromJSON({
      '/workspace/test-package/composer.json': JSON.stringify(composerJson),
    });

    const results = createNodesFunction(['test-package/composer.json'], undefined, mockContext);
    const [, result] = results[0];

    expect(result.projects).toHaveProperty('test-package');
    const project = result.projects!['test-package'];
    
    // Should not have any targets including test
    expect(project.targets).toBeUndefined();
  });

  it('should add tags based on composer type and keywords', () => {
    const composerJson = {
      name: 'test/package',
      type: 'library',
      keywords: ['testing', 'php', 'utility'],
    };

    vol.fromJSON({
      '/workspace/test-package/composer.json': JSON.stringify(composerJson),
    });

    const results = createNodesFunction(['test-package/composer.json'], undefined, mockContext);
    const [, result] = results[0];

    expect(result.projects).toHaveProperty('test-package');
    const project = result.projects!['test-package'];
    
    expect(project.tags).toContain('composer:library');
    expect(project.tags).toContain('keyword:testing');
    expect(project.tags).toContain('keyword:php');
    expect(project.tags).toContain('keyword:utility');
  });

  it('should handle nested projects', () => {
    const composerJson = {
      name: 'nested/project',
      type: 'library',
    };

    vol.fromJSON({
      '/workspace/packages/vendor/nested-project/composer.json': JSON.stringify(composerJson),
    });

    const results = createNodesFunction(['packages/vendor/nested-project/composer.json'], undefined, mockContext);
    const [, result] = results[0];

    expect(result.projects).toHaveProperty('packages/vendor/nested-project');
    const project = result.projects!['packages/vendor/nested-project'];
    
    expect(project.name).toBe('nested-project');
    expect(project.root).toBe('packages/vendor/nested-project');
  });

  it('should return empty result for invalid composer.json', () => {
    vol.fromJSON({
      '/workspace/invalid-project/composer.json': 'invalid json content',
    });

    const results = createNodesFunction(['invalid-project/composer.json'], undefined, mockContext);
    const [, result] = results[0];

    expect(result).toEqual({});
  });

  it('should return empty result for non-existent composer.json', () => {
    const results = createNodesFunction(['non-existent/composer.json'], undefined, mockContext);
    const [, result] = results[0];

    expect(result).toEqual({});
  });

  it('should handle multiple PSR-4 autoload directories', () => {
    const composerJson = {
      name: 'test/multi-src',
      autoload: {
        'psr-4': {
          'Test\\Core\\': 'src/Core/',
          'Test\\Utils\\': 'src/Utils/',
          'Test\\Main\\': 'lib/',
        },
      },
    };

    vol.fromJSON({
      '/workspace/multi-src/composer.json': JSON.stringify(composerJson),
    });

    const results = createNodesFunction(['multi-src/composer.json'], undefined, mockContext);
    const [, result] = results[0];

    expect(result.projects).toHaveProperty('multi-src');
    const project = result.projects!['multi-src'];
    
    // Should use the first PSR-4 directory
    expect(project.sourceRoot).toBe('multi-src/src/Core');
  });

  it('should handle multiple composer.json files', () => {
    const composerJson1 = {
      name: 'package/one',
      type: 'library',
    };
    const composerJson2 = {
      name: 'package/two',
      type: 'project',
    };

    vol.fromJSON({
      '/workspace/package-one/composer.json': JSON.stringify(composerJson1),
      '/workspace/package-two/composer.json': JSON.stringify(composerJson2),
    });

    const results = createNodesFunction(['package-one/composer.json', 'package-two/composer.json'], undefined, mockContext);
    
    expect(results).toHaveLength(2);
    
    const [configFile1, result1] = results[0];
    const [configFile2, result2] = results[1];
    
    expect(configFile1).toBe('package-one/composer.json');
    expect(result1.projects).toHaveProperty('package-one');
    expect(result1.projects!['package-one'].projectType).toBe('library');
    
    expect(configFile2).toBe('package-two/composer.json');
    expect(result2.projects).toHaveProperty('package-two');
    expect(result2.projects!['package-two'].projectType).toBe('application');
  });
});

describe('createDependencies', () => {
  const { createDependencies } = require('./project-discovery');
  let mockContext: CreateDependenciesContext;
  const workspaceRoot = '/workspace';

  beforeEach(() => {
    vol.reset();
    mockContext = {
      nxJsonConfiguration: {},
      workspaceRoot,
      externalNodes: {},
      projects: {},
      fileMap: { projectFileMap: {}, nonProjectFiles: [] },
      filesToProcess: { projectFileMap: {}, nonProjectFiles: [] },
    } as CreateDependenciesContext;
  });

  it('should create dependencies between workspace projects', () => {
    // Set up projects
    (mockContext as any).projects = {
      'package-a': {
        name: 'package-a',
        root: 'packages/package-a',
        projectType: 'library',
      },
      'vendor-package-b': {
        name: 'vendor-package-b', 
        root: 'packages/package-b',
        projectType: 'library',
      },
    };

    // Set up composer.json files
    const composerJsonA = {
      name: 'my-workspace/package-a',
      require: {
        php: '^8.0',
        'vendor/package-b': '^1.0', // This should match 'vendor-package-b' project
      },
    };

    const composerJsonB = {
      name: 'vendor/package-b',
      require: {
        php: '^8.0',
      },
    };

    vol.fromJSON({
      '/workspace/packages/package-a/composer.json': JSON.stringify(composerJsonA),
      '/workspace/packages/package-b/composer.json': JSON.stringify(composerJsonB),
    });

    const dependencies = createDependencies(undefined, mockContext);

    expect(dependencies).toHaveLength(1);
    expect(dependencies[0]).toEqual({
      source: 'package-a',
      target: 'vendor-package-b',
      type: 'static',
      sourceFile: 'packages/package-a/composer.json',
    });
  });

  it('should create dependencies for require-dev dependencies', () => {
    (mockContext as any).projects = {
      'test-lib': {
        name: 'test-lib',
        root: 'libs/test-lib',
        projectType: 'library',
      },
      'main-app': {
        name: 'main-app',
        root: 'apps/main-app', 
        projectType: 'application',
      },
    };

    const composerJsonApp = {
      name: 'my-workspace/main-app',
      'require-dev': {
        'my-workspace/test-lib': '^1.0',
      },
    };

    const composerJsonLib = {
      name: 'my-workspace/test-lib',
    };

    vol.fromJSON({
      '/workspace/apps/main-app/composer.json': JSON.stringify(composerJsonApp),
      '/workspace/libs/test-lib/composer.json': JSON.stringify(composerJsonLib),
    });

    const dependencies = createDependencies(undefined, mockContext);

    expect(dependencies).toHaveLength(1);
    expect(dependencies[0]).toEqual({
      source: 'main-app',
      target: 'test-lib',
      type: 'static',
      sourceFile: 'apps/main-app/composer.json',
    });
  });

  it('should not create circular dependencies', () => {
    (mockContext as any).projects = {
      'package-a': {
        name: 'package-a',
        root: 'packages/package-a',
        projectType: 'library',
      },
    };

    const composerJson = {
      name: 'my-workspace/package-a',
      require: {
        'my-workspace/package-a': '^1.0', // Self-dependency
      },
    };

    vol.fromJSON({
      '/workspace/packages/package-a/composer.json': JSON.stringify(composerJson),
    });

    const dependencies = createDependencies(undefined, mockContext);

    // Should not create self-dependency
    expect(dependencies).toHaveLength(0);
  });

  it('should handle missing composer.json files gracefully', () => {
    (mockContext as any).projects = {
      'package-without-composer': {
        name: 'package-without-composer',
        root: 'packages/no-composer',
        projectType: 'library',
      },
    };

    // No composer.json file exists

    const dependencies = createDependencies(undefined, mockContext);

    expect(dependencies).toHaveLength(0);
  });

  it('should ignore external dependencies not in workspace', () => {
    (mockContext as any).projects = {
      'my-app': {
        name: 'my-app', 
        root: 'apps/my-app',
        projectType: 'application',
      },
    };

    const composerJson = {
      name: 'my-workspace/my-app',
      require: {
        php: '^8.0',
        'symfony/console': '^5.0', // External dependency
        'doctrine/orm': '^2.0', // External dependency
      },
    };

    vol.fromJSON({
      '/workspace/apps/my-app/composer.json': JSON.stringify(composerJson),
    });

    const dependencies = createDependencies(undefined, mockContext);

    // Should not create dependencies for external packages
    expect(dependencies).toHaveLength(0);
  });

  it('should handle multiple dependencies between projects', () => {
    (mockContext as any).projects = {
      'app': {
        name: 'app',
        root: 'apps/main',
        projectType: 'application',
      },
      'lib-a': {
        name: 'lib-a',
        root: 'libs/lib-a', 
        projectType: 'library',
      },
      'lib-b': {
        name: 'lib-b',
        root: 'libs/lib-b',
        projectType: 'library',
      },
    };

    const composerJsonApp = {
      name: 'my-workspace/app',
      require: {
        'my-workspace/lib-a': '^1.0',
      },
      'require-dev': {
        'my-workspace/lib-b': '^1.0',
      },
    };

    const composerJsonA = { name: 'my-workspace/lib-a' };
    const composerJsonB = { name: 'my-workspace/lib-b' };

    vol.fromJSON({
      '/workspace/apps/main/composer.json': JSON.stringify(composerJsonApp),
      '/workspace/libs/lib-a/composer.json': JSON.stringify(composerJsonA),
      '/workspace/libs/lib-b/composer.json': JSON.stringify(composerJsonB),
    });

    const dependencies = createDependencies(undefined, mockContext);

    expect(dependencies).toHaveLength(2);
    expect(dependencies).toContainEqual({
      source: 'app',
      target: 'lib-a',
      type: 'static',
      sourceFile: 'apps/main/composer.json',
    });
    expect(dependencies).toContainEqual({
      source: 'app',
      target: 'lib-b',
      type: 'static',
      sourceFile: 'apps/main/composer.json',
    });
  });
});