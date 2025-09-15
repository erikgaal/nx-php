import { CreateNodesContextV2 } from '@nx/devkit';
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

  it('should detect application type based on require-dev dependencies', () => {
    const composerJson = {
      name: 'my/app',
      'require-dev': {
        'phpunit/phpunit': '^9.0',
      },
    };

    vol.fromJSON({
      '/workspace/my-app/composer.json': JSON.stringify(composerJson),
    });

    const results = createNodesFunction(['my-app/composer.json'], undefined, mockContext);
    const [, result] = results[0];

    expect(result.projects).toHaveProperty('my-app');
    const project = result.projects!['my-app'];
    
    expect(project.projectType).toBe('application');
    expect(project.targets).toHaveProperty('test');
  });

  it('should detect application type based on scripts', () => {
    const composerJson = {
      name: 'my/console-app',
      scripts: {
        'start': 'php bin/console',
        'test': 'phpunit',
      },
    };

    vol.fromJSON({
      '/workspace/console-app/composer.json': JSON.stringify(composerJson),
    });

    const results = createNodesFunction(['console-app/composer.json'], undefined, mockContext);
    const [, result] = results[0];

    expect(result.projects).toHaveProperty('console-app');
    const project = result.projects!['console-app'];
    
    expect(project.projectType).toBe('application');
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

  it('should create common targets', () => {
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
    
    expect(project.targets).toHaveProperty('install');
    expect(project.targets).toHaveProperty('update');
    expect(project.targets).toHaveProperty('validate');
    
    expect(project.targets!.install.executor).toBe('nx:run-commands');
    expect(project.targets!.install.options.command).toBe('composer install');
    expect(project.targets!.install.options.cwd).toBe('test-package');
  });

  it('should add test target when phpunit is in require-dev', () => {
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
    
    expect(project.targets).toHaveProperty('test');
    expect(project.targets!.test.options.command).toBe('vendor/bin/phpunit');
    expect(project.targets!.test.dependsOn).toEqual(['install']);
  });

  it('should add test target with custom script command', () => {
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
    
    expect(project.targets).toHaveProperty('test');
    expect(project.targets!.test.options.command).toBe('vendor/bin/phpunit --coverage-clover coverage.xml');
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
      'require-dev': {
        'phpunit/phpunit': '^9.0',
      },
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