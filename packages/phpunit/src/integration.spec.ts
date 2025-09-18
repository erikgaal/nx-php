import { CreateNodesContextV2 } from '@nx/devkit';
import { createNodesV2 } from './project-discovery';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';

describe('phpunit project-discovery integration', () => {
  const testWorkspaceRoot = '/tmp/test-phpunit-workspace';
  let mockContext: CreateNodesContextV2;

  beforeAll(() => {
    // Create a real test workspace
    if (existsSync(testWorkspaceRoot)) {
      rmSync(testWorkspaceRoot, { recursive: true, force: true });
    }
    mkdirSync(testWorkspaceRoot, { recursive: true });
  });

  afterAll(() => {
    // Clean up
    if (existsSync(testWorkspaceRoot)) {
      rmSync(testWorkspaceRoot, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    mockContext = {
      nxJsonConfiguration: {},
      workspaceRoot: testWorkspaceRoot,
    };
  });

  const [, createNodesFunction] = createNodesV2;

  it('should work with real files on disk', () => {
    // Create a real project structure
    const projectDir = `${testWorkspaceRoot}/real-project`;
    mkdirSync(projectDir, { recursive: true });
    
    // Create composer.json
    writeFileSync(`${projectDir}/composer.json`, JSON.stringify({
      name: 'test/real-project',
      type: 'library',
      require: { php: '^8.0' },
      'require-dev': { 'phpunit/phpunit': '^10.0' }
    }));

    // Create phpunit.xml
    writeFileSync(`${projectDir}/phpunit.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <testsuites>
    <testsuite name="Unit">
      <directory suffix="Test.php">./tests</directory>
    </testsuite>
  </testsuites>
</phpunit>`);

    // Test the plugin
    const results = createNodesFunction(['real-project/composer.json'], undefined, mockContext);

    expect(results).toHaveLength(1);
    const [configFile, result] = results[0];
    
    expect(configFile).toBe('real-project/composer.json');
    expect(result.projects).toHaveProperty('real-project');
    
    const project = result.projects!['real-project'];
    expect(project.targets?.phpunit).toBeDefined();
    expect(project.targets!.phpunit.options.command).toBe('vendor/bin/phpunit --configuration phpunit.xml');
    expect(project.targets!.phpunit.options.cwd).toBe('real-project');
  });

  it('should handle multiple real projects with different configurations', () => {
    // Create project with phpunit.xml
    const project1Dir = `${testWorkspaceRoot}/project-xml`;
    mkdirSync(project1Dir, { recursive: true });
    writeFileSync(`${project1Dir}/composer.json`, JSON.stringify({ name: 'test/project-xml' }));
    writeFileSync(`${project1Dir}/phpunit.xml`, '<phpunit></phpunit>');

    // Create project with phpunit.xml.dist
    const project2Dir = `${testWorkspaceRoot}/project-dist`;
    mkdirSync(project2Dir, { recursive: true });
    writeFileSync(`${project2Dir}/composer.json`, JSON.stringify({ name: 'test/project-dist' }));
    writeFileSync(`${project2Dir}/phpunit.xml.dist`, '<phpunit></phpunit>');

    // Create project without phpunit config
    const project3Dir = `${testWorkspaceRoot}/project-no-phpunit`;
    mkdirSync(project3Dir, { recursive: true });
    writeFileSync(`${project3Dir}/composer.json`, JSON.stringify({ name: 'test/project-no-phpunit' }));

    const results = createNodesFunction([
      'project-xml/composer.json',
      'project-dist/composer.json',
      'project-no-phpunit/composer.json'
    ], undefined, mockContext);

    expect(results).toHaveLength(3);

    // Project with phpunit.xml should have target
    const result1 = results[0];
    expect(result1[1].projects).toHaveProperty('project-xml');
    expect(result1[1].projects!['project-xml'].targets!.phpunit.options.command)
      .toBe('vendor/bin/phpunit --configuration phpunit.xml');

    // Project with phpunit.xml.dist should have target
    const result2 = results[1];
    expect(result2[1].projects).toHaveProperty('project-dist');
    expect(result2[1].projects!['project-dist'].targets!.phpunit.options.command)
      .toBe('vendor/bin/phpunit --configuration phpunit.xml.dist');

    // Project without phpunit config should not have target
    const result3 = results[2];
    expect(result3[1].projects).toBeUndefined();
  });
});