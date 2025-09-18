import { CreateNodesContextV2 } from '@nx/devkit';
import { createNodesV2 } from './project-discovery';
import { vol } from 'memfs';

// Mock fs to use memfs for testing
jest.mock('fs', () => ({
  ...jest.requireActual('memfs').fs,
}));

describe('phpunit project-discovery', () => {
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

  it('should create phpunit target when phpunit.xml is present', () => {
    vol.fromJSON({
      '/workspace/my-project/composer.json': JSON.stringify({ name: 'test/project' }),
      '/workspace/my-project/phpunit.xml': `<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd">
  <testsuites>
    <testsuite name="Unit">
      <directory suffix="Test.php">./tests/Unit</directory>
    </testsuite>
  </testsuites>
</phpunit>`,
    });

    const results = createNodesFunction(['my-project/composer.json'], undefined, mockContext);

    expect(results).toHaveLength(1);
    const [configFile, result] = results[0];
    
    expect(configFile).toBe('my-project/composer.json');
    expect(result.projects).toHaveProperty('my-project');
    
    const project = result.projects!['my-project'];
    expect(project.targets?.phpunit).toBeDefined();
    expect(project.targets!.phpunit.executor).toBe('nx:run-commands');
    expect(project.targets!.phpunit.options.command).toBe('vendor/bin/phpunit --configuration phpunit.xml');
    expect(project.targets!.phpunit.options.cwd).toBe('my-project');
    expect(project.tags).toContain('phpunit');
  });

  it('should create phpunit target when phpunit.xml.dist is present', () => {
    vol.fromJSON({
      '/workspace/lib-project/composer.json': JSON.stringify({ name: 'test/lib' }),
      '/workspace/lib-project/phpunit.xml.dist': `<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd">
  <testsuites>
    <testsuite name="Unit">
      <directory suffix="Test.php">./tests/Unit</directory>
    </testsuite>
  </testsuites>
</phpunit>`,
    });

    const results = createNodesFunction(['lib-project/composer.json'], undefined, mockContext);

    expect(results).toHaveLength(1);
    const [, result] = results[0];
    
    expect(result.projects).toHaveProperty('lib-project');
    
    const project = result.projects!['lib-project'];
    expect(project.targets?.phpunit).toBeDefined();
    expect(project.targets!.phpunit.options.command).toBe('vendor/bin/phpunit --configuration phpunit.xml.dist');
  });

  it('should create phpunit target when .phpunit.xml is present', () => {
    vol.fromJSON({
      '/workspace/hidden-config/composer.json': JSON.stringify({ name: 'test/hidden' }),
      '/workspace/hidden-config/.phpunit.xml': `<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <testsuites>
    <testsuite name="Unit">
      <directory suffix="Test.php">./tests/Unit</directory>
    </testsuite>
  </testsuites>
</phpunit>`,
    });

    const results = createNodesFunction(['hidden-config/composer.json'], undefined, mockContext);

    expect(results).toHaveLength(1);
    const [, result] = results[0];
    
    const project = result.projects!['hidden-config'];
    expect(project.targets?.phpunit).toBeDefined();
    expect(project.targets!.phpunit.options.command).toBe('vendor/bin/phpunit --configuration .phpunit.xml');
  });

  it('should not create phpunit target when no phpunit config is present', () => {
    vol.fromJSON({
      '/workspace/no-phpunit/composer.json': JSON.stringify({ name: 'test/no-phpunit' }),
    });

    const results = createNodesFunction(['no-phpunit/composer.json'], undefined, mockContext);

    expect(results).toHaveLength(1);
    const [configFile, result] = results[0];
    
    expect(configFile).toBe('no-phpunit/composer.json');
    expect(result.projects).toBeUndefined(); // Empty result when no PHPUnit config
  });

  it('should prioritize phpunit.xml over phpunit.xml.dist', () => {
    vol.fromJSON({
      '/workspace/priority-test/composer.json': JSON.stringify({ name: 'test/priority' }),
      '/workspace/priority-test/phpunit.xml': '<?xml version="1.0"?><phpunit></phpunit>',
      '/workspace/priority-test/phpunit.xml.dist': '<?xml version="1.0"?><phpunit></phpunit>',
    });

    const results = createNodesFunction(['priority-test/composer.json'], undefined, mockContext);

    expect(results).toHaveLength(1);
    const [, result] = results[0];
    
    const project = result.projects!['priority-test'];
    expect(project.targets!.phpunit.options.command).toBe('vendor/bin/phpunit --configuration phpunit.xml');
  });

  it('should handle nested projects correctly', () => {
    vol.fromJSON({
      '/workspace/packages/my-lib/composer.json': JSON.stringify({ name: 'vendor/my-lib' }),
      '/workspace/packages/my-lib/phpunit.xml': '<?xml version="1.0"?><phpunit></phpunit>',
    });

    const results = createNodesFunction(['packages/my-lib/composer.json'], undefined, mockContext);

    expect(results).toHaveLength(1);
    const [configFile, result] = results[0];
    
    expect(configFile).toBe('packages/my-lib/composer.json');
    expect(result.projects).toHaveProperty('packages/my-lib');
    
    const project = result.projects!['packages/my-lib'];
    expect(project.root).toBe('packages/my-lib');
    expect(project.name).toBe('packages-my-lib');
    expect(project.targets!.phpunit.options.cwd).toBe('packages/my-lib');
  });

  it('should handle multiple projects with different phpunit configs', () => {
    vol.fromJSON({
      '/workspace/project-a/composer.json': JSON.stringify({ name: 'test/project-a' }),
      '/workspace/project-a/phpunit.xml': '<?xml version="1.0"?><phpunit></phpunit>',
      '/workspace/project-b/composer.json': JSON.stringify({ name: 'test/project-b' }),
      '/workspace/project-b/phpunit.xml.dist': '<?xml version="1.0"?><phpunit></phpunit>',
      '/workspace/project-c/composer.json': JSON.stringify({ name: 'test/project-c' }),
      // project-c has no phpunit config
    });

    const results = createNodesFunction(
      ['project-a/composer.json', 'project-b/composer.json', 'project-c/composer.json'], 
      undefined, 
      mockContext
    );

    expect(results).toHaveLength(3); // All projects return results, but only A and B have phpunit targets

    const resultA = results[0]; // project-a
    const resultB = results[1]; // project-b  
    const resultC = results[2]; // project-c

    expect(resultA[0]).toBe('project-a/composer.json');
    expect(resultB[0]).toBe('project-b/composer.json');
    expect(resultC[0]).toBe('project-c/composer.json');

    // Project A should have phpunit target
    expect(resultA[1].projects).toHaveProperty('project-a');
    expect(resultA[1].projects!['project-a'].targets!.phpunit.options.command)
      .toBe('vendor/bin/phpunit --configuration phpunit.xml');

    // Project B should have phpunit target  
    expect(resultB[1].projects).toHaveProperty('project-b');
    expect(resultB[1].projects!['project-b'].targets!.phpunit.options.command)
      .toBe('vendor/bin/phpunit --configuration phpunit.xml.dist');

    // Project C should have no projects (empty result)
    expect(resultC[1].projects).toBeUndefined();
  });

  it('should include metadata and help information', () => {
    vol.fromJSON({
      '/workspace/test-meta/composer.json': JSON.stringify({ name: 'test/meta' }),
      '/workspace/test-meta/phpunit.xml': '<?xml version="1.0"?><phpunit></phpunit>',
    });

    const results = createNodesFunction(['test-meta/composer.json'], undefined, mockContext);

    const [, result] = results[0];
    const project = result.projects!['test-meta'];
    const phpunitTarget = project.targets!.phpunit;

    expect(phpunitTarget.metadata).toBeDefined();
    expect(phpunitTarget.metadata!.technologies).toContain('phpunit');
    expect(phpunitTarget.metadata!.description).toBe('Run PHPUnit tests');
    expect(phpunitTarget.metadata!.help).toBeDefined();
    expect(phpunitTarget.metadata!.help!.example).toBeDefined();
    expect(phpunitTarget.metadata!.help!.example!.options).toHaveProperty('--coverage-text');
    expect(phpunitTarget.metadata!.help!.example!.options).toHaveProperty('--filter');
    expect(phpunitTarget.metadata!.help!.example!.options).toHaveProperty('--group');
  });

  it('should handle all supported phpunit config file variants', () => {
    const configFiles = [
      'phpunit.xml',
      'phpunit.xml.dist', 
      'phpunit.dist.xml',
      '.phpunit.xml',
      '.phpunit.xml.dist',
      'phpunit.config.xml'
    ];

    for (let i = 0; i < configFiles.length; i++) {
      const projectName = `project-${i}`;
      const configFile = configFiles[i];
      
      vol.fromJSON({
        [`/workspace/${projectName}/composer.json`]: JSON.stringify({ name: `test/${projectName}` }),
        [`/workspace/${projectName}/${configFile}`]: '<?xml version="1.0"?><phpunit></phpunit>',
      });

      const results = createNodesFunction([`${projectName}/composer.json`], undefined, mockContext);

      expect(results).toHaveLength(1);
      const [, result] = results[0];
      const project = result.projects![projectName];
      expect(project.targets!.phpunit.options.command).toBe(`vendor/bin/phpunit --configuration ${configFile}`);

      vol.reset();
      mockContext = {
        nxJsonConfiguration: {},
        workspaceRoot,
      };
    }
  });
});