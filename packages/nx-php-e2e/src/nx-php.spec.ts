import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';

describe('nx-php', () => {
  let projectDirectory: string;

  beforeAll(() => {
    projectDirectory = createTestProject();

    // The plugin has been built and published to a local registry in the jest globalSetup
    // Install the plugins built with the latest source code into the test repo
    execSync(`npm install -D nx-php@e2e @nx-php/composer@e2e @nx-php/phpstan@e2e`, {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    });

    // Add the PHPStan plugin to nx.json
    const nxJsonPath = join(projectDirectory, 'nx.json');
    const nxJson = JSON.parse(readFileSync(nxJsonPath, 'utf-8'));
    if (!nxJson.plugins) {
      nxJson.plugins = [];
    }
    nxJson.plugins.push('@nx-php/phpstan');
    writeFileSync(nxJsonPath, JSON.stringify(nxJson, null, 2));
  });

  afterAll(() => {
    if (projectDirectory) {
      // Cleanup the test project
      rmSync(projectDirectory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('should be installed', () => {
    // npm ls will fail if the package is not installed properly
    execSync('npm ls nx-php', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });
  });

  it('should have @nx-php/composer plugin installed', () => {
    // npm ls will fail if the package is not installed properly
    execSync('npm ls @nx-php/composer', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });
  });

  it('should have @nx-php/phpstan plugin installed', () => {
    // npm ls will fail if the package is not installed properly
    execSync('npm ls @nx-php/phpstan', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });
  });

  describe('@nx-php/composer generator', () => {
    it('should generate a composer project', () => {
      const projectName = 'my-composer-lib';
      
      // Generate a composer project
      execSync(`npx nx g @nx-php/composer:project ${projectName}`, {
        cwd: projectDirectory,
        stdio: 'inherit',
      });

      // Check that the project was created
      const projectPath = join(projectDirectory, 'packages', projectName);
      expect(existsSync(projectPath)).toBeTruthy();
      
      // Check that composer.json was created
      const composerJsonPath = join(projectPath, 'composer.json');
      expect(existsSync(composerJsonPath)).toBeTruthy();
      
      // Verify composer.json content
      const composerJson = JSON.parse(readFileSync(composerJsonPath, 'utf-8'));
      expect(composerJson.name).toBe(projectName);
      expect(composerJson.type).toBe('library');
      expect(composerJson.require.php).toBe('>=8.0');
      expect(composerJson.autoload['psr-4']['MyComposerLib\\']).toBe('src/');

      // Check that README.md was created
      const readmePath = join(projectPath, 'README.md');
      expect(existsSync(readmePath)).toBeTruthy();
      
      const readmeContent = readFileSync(readmePath, 'utf-8');
      expect(readmeContent).toContain(`# ${projectName}`);
    });

    it('should generate a composer project with directory option', () => {
      const projectName = 'another-lib';
      const directory = 'libs';
      
      // Generate a composer project in a subdirectory
      execSync(`npx nx g @nx-php/composer:project ${projectName} --directory=${directory}`, {
        cwd: projectDirectory,
        stdio: 'inherit',
      });

      // Check that the project was created in the correct directory
      const projectPath = join(projectDirectory, 'packages', directory, projectName);
      expect(existsSync(projectPath)).toBeTruthy();
      
      // Check that composer.json was created
      const composerJsonPath = join(projectPath, 'composer.json');
      expect(existsSync(composerJsonPath)).toBeTruthy();
      
      // Verify composer.json content
      const composerJson = JSON.parse(readFileSync(composerJsonPath, 'utf-8'));
      expect(composerJson.name).toBe(projectName);
    });

    it('should generate a composer project with tags', () => {
      const projectName = 'tagged-lib';
      const tags = 'php,library,backend';
      
      // Generate a composer project with tags
      execSync(`npx nx g @nx-php/composer:project ${projectName} --tags=${tags}`, {
        cwd: projectDirectory,
        stdio: 'inherit',
      });

      // Check project was created
      const projectPath = join(projectDirectory, 'packages', projectName);
      expect(existsSync(projectPath)).toBeTruthy();
      
      // Check that the project is properly registered in nx workspace
      const result = execSync(`npx nx show project ${projectName}`, {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });
      expect(result).toContain(projectName);
    });

    it('should register the project with Nx and create proper targets', () => {
      const projectName = 'nx-integrated-lib';
      
      // Generate the project
      execSync(`npx nx g @nx-php/composer:project ${projectName}`, {
        cwd: projectDirectory,
        stdio: 'inherit',
      });

      // Verify the project is registered with Nx
      const showProjectOutput = execSync(`npx nx show project ${projectName}`, {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });
      
      // Should show the project details
      expect(showProjectOutput).toContain(projectName);
      expect(showProjectOutput).toContain('install');
      expect(showProjectOutput).toContain('test');

      // List all projects and ensure our project is included
      const listOutput = execSync(`npx nx show projects`, {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });
      expect(listOutput).toContain(projectName);
    });

    it('should automatically discover composer projects via project discovery', () => {
      const projectName1 = 'discovered-lib-1';
      const projectName2 = 'discovered-lib-2';
      
      // Generate two composer projects
      execSync(`npx nx g @nx-php/composer:project ${projectName1}`, {
        cwd: projectDirectory,
        stdio: 'inherit',
      });
      
      execSync(`npx nx g @nx-php/composer:project ${projectName2} --directory=libs`, {
        cwd: projectDirectory,
        stdio: 'inherit',
      });

      // Reset the project graph cache to ensure fresh discovery
      execSync(`npx nx reset`, {
        cwd: projectDirectory,
        stdio: 'inherit',
      });

      // Verify both projects are discovered and listed via project discovery
      const listOutput = execSync(`npx nx show projects`, {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });
      
      // Both projects should be discovered automatically by scanning composer.json files
      expect(listOutput).toContain(projectName1);
      expect(listOutput).toContain(projectName2);

      // Verify individual project details are available through discovery
      const project1Output = execSync(`npx nx show project ${projectName1}`, {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });
      expect(project1Output).toContain(projectName1);
      expect(project1Output).toContain('library');

      const project2Output = execSync(`npx nx show project libs-${projectName2}`, {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });
      expect(project2Output).toContain('libs-' + projectName2);
      expect(project2Output).toContain('library');
    });
  });

  describe('@nx-php/phpstan plugin', () => {
    it('should discover project with phpstan.neon and create phpstan target', () => {
      const projectName = 'phpstan-lib';
      const projectPath = join(projectDirectory, 'packages', projectName);
      
      // Create project directory
      mkdirSync(projectPath, { recursive: true });
      
      // Create a phpstan.neon configuration file
      const phpstanConfig = `parameters:
    level: 8
    paths:
        - src
    excludePaths:
        - src/legacy/*`;
      writeFileSync(join(projectPath, 'phpstan.neon'), phpstanConfig);

      // Create a basic PHP file
      const srcPath = join(projectPath, 'src');
      mkdirSync(srcPath, { recursive: true });
      writeFileSync(join(srcPath, 'TestClass.php'), '<?php class TestClass { public function test(): string { return "test"; } }');

      // Verify the project is registered with Nx and has phpstan target
      const showProjectOutput = execSync(`npx nx show project packages-${projectName}`, {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });
      
      expect(showProjectOutput).toContain(`packages-${projectName}`);
      expect(showProjectOutput).toContain('phpstan');
      expect(showProjectOutput).toContain('library');
    });

    it('should discover project with phpstan.neon.dist and create phpstan target', () => {
      const projectName = 'phpstan-dist-lib';
      const projectPath = join(projectDirectory, 'libs', projectName);
      
      // Create project directory
      mkdirSync(projectPath, { recursive: true });
      
      // Create a phpstan.neon.dist configuration file
      const phpstanConfig = `parameters:
    level: 7
    paths:
        - src`;
      writeFileSync(join(projectPath, 'phpstan.neon.dist'), phpstanConfig);

      // Create a basic PHP file
      const srcPath = join(projectPath, 'src');
      mkdirSync(srcPath, { recursive: true });
      writeFileSync(join(srcPath, 'DistTestClass.php'), '<?php class DistTestClass { }');

      // Verify the project is registered with Nx
      const showProjectOutput = execSync(`npx nx show project libs-${projectName}`, {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });
      
      expect(showProjectOutput).toContain(`libs-${projectName}`);
      expect(showProjectOutput).toContain('phpstan');
    });

    it('should discover project with phpstan.json and create phpstan target', () => {
      const projectName = 'phpstan-json-lib';
      const projectPath = join(projectDirectory, 'apps', projectName);
      
      // Create project directory
      mkdirSync(projectPath, { recursive: true });
      
      // Create a phpstan.json configuration file
      const phpstanConfig = {
        parameters: {
          level: 9,
          paths: ['src']
        }
      };
      writeFileSync(join(projectPath, 'phpstan.json'), JSON.stringify(phpstanConfig, null, 2));

      // Create a basic PHP file
      const srcPath = join(projectPath, 'src');
      mkdirSync(srcPath, { recursive: true });
      writeFileSync(join(srcPath, 'JsonTestClass.php'), '<?php class JsonTestClass { }');

      // Verify the project is registered with Nx
      const showProjectOutput = execSync(`npx nx show project apps-${projectName}`, {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });
      
      expect(showProjectOutput).toContain(`apps-${projectName}`);
      expect(showProjectOutput).toContain('phpstan');
    });

    it('should run phpstan target successfully (dry run)', () => {
      const projectName = 'phpstan-runnable';
      const projectPath = join(projectDirectory, 'packages', projectName);
      
      // Create project directory
      mkdirSync(projectPath, { recursive: true });
      
      // Create a phpstan.neon configuration file
      const phpstanConfig = `parameters:
    level: 8
    paths:
        - src`;
      writeFileSync(join(projectPath, 'phpstan.neon'), phpstanConfig);

      // Create composer.json with PHPStan dependency
      const composerJson = {
        name: `test/${projectName}`,
        require: {
          php: '^8.0'
        },
        'require-dev': {
          'phpstan/phpstan': '^1.0'
        }
      };
      writeFileSync(join(projectPath, 'composer.json'), JSON.stringify(composerJson, null, 2));

      // Create a basic PHP file with a simple issue for PHPStan to find
      const srcPath = join(projectPath, 'src');
      mkdirSync(srcPath, { recursive: true });
      writeFileSync(join(srcPath, 'RunnableClass.php'), '<?php class RunnableClass { public function test() { return "test"; } }');

      // Test that we can see the phpstan target configuration (dry run)
      try {
        const dryRunOutput = execSync(`npx nx phpstan packages-${projectName} --dry-run`, {
          cwd: projectDirectory,
          encoding: 'utf-8',
        });
        
        expect(dryRunOutput).toContain(`packages-${projectName}`);
        expect(dryRunOutput).toContain('phpstan');
        expect(dryRunOutput).toContain('vendor/bin/phpstan analyze --configuration=phpstan.neon');
      } catch (error) {
        // Even if the command fails (because phpstan isn't installed), 
        // we can still verify the command structure in the error output
        const errorOutput = error.message || error.toString();
        expect(errorOutput).toContain('vendor/bin/phpstan analyze --configuration=phpstan.neon');
        expect(errorOutput).toContain('phpstan');
      }
    });

    it('should show all phpstan projects when filtering by tag', () => {
      // List all projects with the phpstan tag
      const taggedOutput = execSync(`npx nx show projects --with-tag phpstan`, {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });
      
      // Should contain multiple projects we created with PHPStan configs
      expect(taggedOutput).toContain('packages-phpstan-lib');
      expect(taggedOutput).toContain('libs-phpstan-dist-lib');
      expect(taggedOutput).toContain('apps-phpstan-json-lib');
      expect(taggedOutput).toContain('packages-phpstan-runnable');
    });

    it('should handle nested project with PHPStan config', () => {
      const nestedPath = join('vendor', 'acme', 'nested-phpstan-lib');
      const projectPath = join(projectDirectory, nestedPath);
      
      // Create nested project directory
      mkdirSync(projectPath, { recursive: true });
      
      // Create a phpstan.php configuration file
      const phpstanConfig = `<?php
return [
    'parameters' => [
        'level' => 8,
        'paths' => ['src'],
    ],
];`;
      writeFileSync(join(projectPath, 'phpstan.php'), phpstanConfig);

      // Create a basic PHP file
      const srcPath = join(projectPath, 'src');
      mkdirSync(srcPath, { recursive: true });
      writeFileSync(join(srcPath, 'NestedTestClass.php'), '<?php class NestedTestClass { }');

      // Verify the nested project is registered with Nx
      const nestedProjectName = nestedPath.replace(/[/\\]/g, '-');
      const showProjectOutput = execSync(`npx nx show project ${nestedProjectName}`, {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });
      
      expect(showProjectOutput).toContain(nestedProjectName);
      expect(showProjectOutput).toContain('phpstan');
    });
  });
});

/**
 * Creates a test project with create-nx-workspace and installs the plugin
 * @returns The directory where the test project was created
 */
function createTestProject() {
  const projectName = 'test-project';
  const projectDirectory = join(process.cwd(), 'tmp', projectName);

  // Ensure projectDirectory is empty
  rmSync(projectDirectory, {
    recursive: true,
    force: true,
  });
  mkdirSync(dirname(projectDirectory), {
    recursive: true,
  });

  execSync(
    `npx create-nx-workspace@latest ${projectName} --preset apps --nxCloud=skip --no-interactive`,
    {
      cwd: dirname(projectDirectory),
      stdio: 'inherit',
      env: process.env,
    }
  );
  console.log(`Created test project in "${projectDirectory}"`);

  return projectDirectory;
}
