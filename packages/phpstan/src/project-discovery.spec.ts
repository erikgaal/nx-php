import { CreateNodesContextV2 } from '@nx/devkit';
import { createNodesV2 } from './project-discovery';
import { vol } from 'memfs';

// Mock fs to use memfs for testing
jest.mock('fs', () => ({
  ...jest.requireActual('memfs').fs,
}));

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('phpstan project-discovery', () => {
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

  it('should match PHPStan configuration files', () => {
    expect(pattern).toContain('phpstan.neon');
    expect(pattern).toContain('phpstan.neon.dist');
    expect(pattern).toContain('phpstan.json');
    expect(pattern).toContain('phpstan.json.dist');
    expect(pattern).toContain('phpstan.php');
    expect(pattern).toContain('phpstan.php.dist');
  });

  it('should create project with phpstan target when phpstan.neon exists', () => {
    vol.fromJSON({
      '/workspace/my-project/phpstan.neon': 'includes:\n  - phpstan-baseline.neon\n',
    });

    const results = createNodesFunction(['my-project/phpstan.neon'], undefined, mockContext);
    const [configFile, result] = results[0];
    
    expect(configFile).toBe('my-project/phpstan.neon');
    expect(result.projects).toHaveProperty('my-project');
    
    const project = result.projects!['my-project'];
    expect(project.name).toBe('my-project');
    expect(project.root).toBe('my-project');
    expect(project.projectType).toBe('library');
    expect(project.tags).toContain('phpstan');
    expect(project.targets).toHaveProperty('phpstan');
    
    const phpstanTarget = project.targets!.phpstan;
    expect(phpstanTarget.executor).toBe('nx:run-commands');
    expect(phpstanTarget.options.command).toBe('vendor/bin/phpstan analyze --configuration=phpstan.neon');
    expect(phpstanTarget.cache).toBe(true);
  });

  it('should create project with phpstan target when phpstan.neon.dist exists', () => {
    vol.fromJSON({
      '/workspace/lib-package/phpstan.neon.dist': 'parameters:\n  level: 8\n',
    });

    const results = createNodesFunction(['lib-package/phpstan.neon.dist'], undefined, mockContext);
    const [, result] = results[0];
    
    expect(result.projects).toHaveProperty('lib-package');
    const project = result.projects!['lib-package'];
    expect(project.targets!.phpstan.options.command).toBe('vendor/bin/phpstan analyze --configuration=phpstan.neon.dist');
  });

  it('should create project with phpstan target when phpstan.json exists', () => {
    vol.fromJSON({
      '/workspace/json-config/phpstan.json': '{"parameters": {"level": 9}}',
    });

    const results = createNodesFunction(['json-config/phpstan.json'], undefined, mockContext);
    const [, result] = results[0];
    
    expect(result.projects).toHaveProperty('json-config');
    const project = result.projects!['json-config'];
    expect(project.targets!.phpstan.options.command).toBe('vendor/bin/phpstan analyze --configuration=phpstan.json');
  });

  it('should create project with phpstan target when phpstan.php exists', () => {
    vol.fromJSON({
      '/workspace/php-config/phpstan.php': '<?php return ["parameters" => ["level" => 8]];',
    });

    const results = createNodesFunction(['php-config/phpstan.php'], undefined, mockContext);
    const [, result] = results[0];
    
    expect(result.projects).toHaveProperty('php-config');
    const project = result.projects!['php-config'];
    expect(project.targets!.phpstan.options.command).toBe('vendor/bin/phpstan analyze --configuration=phpstan.php');
  });

  it('should handle nested projects', () => {
    vol.fromJSON({
      '/workspace/packages/vendor/nested-project/phpstan.neon': 'parameters:\n  level: 7\n',
    });

    const results = createNodesFunction(['packages/vendor/nested-project/phpstan.neon'], undefined, mockContext);
    const [, result] = results[0];

    expect(result.projects).toHaveProperty('packages/vendor/nested-project');
    const project = result.projects!['packages/vendor/nested-project'];
    expect(project.name).toBe('packages-vendor-nested-project');
    expect(project.root).toBe('packages/vendor/nested-project');
  });

  it('should include proper inputs for the phpstan target', () => {
    vol.fromJSON({
      '/workspace/test-package/phpstan.neon': 'parameters:\n  level: 8\n',
    });

    const results = createNodesFunction(['test-package/phpstan.neon'], undefined, mockContext);
    const [, result] = results[0];

    const project = result.projects!['test-package'];
    const phpstanTarget = project.targets!.phpstan;
    
    expect(phpstanTarget.inputs).toContain('{projectRoot}/**/*.php');
    expect(phpstanTarget.inputs).toContain('{projectRoot}/phpstan.neon');
    expect(phpstanTarget.inputs).toContain('{projectRoot}/composer.json');
    expect(phpstanTarget.inputs).toContain('{projectRoot}/composer.lock');
  });

  it('should prefer phpstan.neon over phpstan.neon.dist when both exist', () => {
    vol.fromJSON({
      '/workspace/multi-config/phpstan.neon': 'parameters:\n  level: 8\n',
      '/workspace/multi-config/phpstan.neon.dist': 'parameters:\n  level: 5\n',
    });

    const results = createNodesFunction(['multi-config/phpstan.neon', 'multi-config/phpstan.neon.dist'], undefined, mockContext);
    const [, result] = results[0];

    const project = result.projects!['multi-config'];
    expect(project.targets!.phpstan.options.command).toBe('vendor/bin/phpstan analyze --configuration=phpstan.neon');
  });

  it('should handle multiple projects with different config types', () => {
    vol.fromJSON({
      '/workspace/project-neon/phpstan.neon': 'parameters:\n  level: 8\n',
      '/workspace/project-json/phpstan.json': '{"parameters": {"level": 9}}',
      '/workspace/project-php/phpstan.php': '<?php return ["parameters" => ["level" => 7]];',
    });

    const results = createNodesFunction([
      'project-neon/phpstan.neon',
      'project-json/phpstan.json',
      'project-php/phpstan.php'
    ], undefined, mockContext);

    expect(results).toHaveLength(3);
    
    const [, result1] = results[0];
    const [, result2] = results[1];
    const [, result3] = results[2];

    expect(result1.projects).toHaveProperty('project-neon');
    expect(result2.projects).toHaveProperty('project-json');
    expect(result3.projects).toHaveProperty('project-php');

    expect(result1.projects!['project-neon'].targets!.phpstan.options.command)
      .toBe('vendor/bin/phpstan analyze --configuration=phpstan.neon');
    expect(result2.projects!['project-json'].targets!.phpstan.options.command)
      .toBe('vendor/bin/phpstan analyze --configuration=phpstan.json');
    expect(result3.projects!['project-php'].targets!.phpstan.options.command)
      .toBe('vendor/bin/phpstan analyze --configuration=phpstan.php');
  });

  it('should not create project when no PHPStan config file exists', () => {
    vol.fromJSON({
      '/workspace/no-config/composer.json': '{"name": "test/package"}',
      '/workspace/no-config/src/SomeClass.php': '<?php class SomeClass {}',
    });

    const results = createNodesFunction(['no-config/composer.json'], undefined, mockContext);
    expect(results).toHaveLength(0);
  });

  it('should skip directory when PHPStan config file does not exist in filesystem', () => {
    // Simulate case where config file is in the pattern but doesn't actually exist
    const results = createNodesFunction(['non-existent/phpstan.neon'], undefined, mockContext);
    expect(results).toHaveLength(0);
  });

  it('should handle Windows-style paths', () => {
    vol.fromJSON({
      '/workspace/packages\\windows\\project/phpstan.neon': 'parameters:\n  level: 8\n',
    });

    const results = createNodesFunction(['packages\\windows\\project/phpstan.neon'], undefined, mockContext);
    const [, result] = results[0];

    expect(result.projects).toHaveProperty('packages\\windows\\project');
    const project = result.projects!['packages\\windows\\project'];
    expect(project.name).toBe('packages-windows-project');
  });

  it('should have consistent project configuration structure', () => {
    vol.fromJSON({
      '/workspace/standard-project/phpstan.neon': 'parameters:\n  level: 8\n',
    });

    const results = createNodesFunction(['standard-project/phpstan.neon'], undefined, mockContext);
    const [, result] = results[0];

    const project = result.projects!['standard-project'];
    
    // Verify all required fields are present
    expect(project).toHaveProperty('name');
    expect(project).toHaveProperty('root');
    expect(project).toHaveProperty('projectType');
    expect(project).toHaveProperty('targets');
    expect(project).toHaveProperty('tags');

    // Verify target structure
    expect(project.targets!.phpstan).toHaveProperty('executor');
    expect(project.targets!.phpstan).toHaveProperty('options');
    expect(project.targets!.phpstan).toHaveProperty('inputs');
    expect(project.targets!.phpstan).toHaveProperty('outputs');
    expect(project.targets!.phpstan).toHaveProperty('cache');
  });
});