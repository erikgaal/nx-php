import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';

describe('nx-php', () => {
  let projectDirectory: string;

  beforeAll(() => {
    projectDirectory = createTestProject();

    // The plugin has been built and published to a local registry in the jest globalSetup
    // Install the plugins built with the latest source code into the test repo
    execSync(`npm install -D nx-php@e2e @nx-php/composer@e2e @nx-php/phpunit@e2e`, {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    });
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

  it('should have @nx-php/phpunit plugin installed', () => {
    // npm ls will fail if the package is not installed properly
    execSync('npm ls @nx-php/phpunit', {
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

  describe('@nx-php/phpunit generator', () => {
    it('should generate a phpunit project with PHPUnit configuration', () => {
      const projectName = 'my-phpunit-lib';
      
      // Generate a phpunit project
      execSync(`npx nx g @nx-php/phpunit:project ${projectName}`, {
        cwd: projectDirectory,
        stdio: 'inherit',
      });

      // Check that the project was created
      const projectPath = join(projectDirectory, 'packages', projectName);
      expect(existsSync(projectPath)).toBeTruthy();
      
      // Check that composer.json was created with PHPUnit
      const composerJsonPath = join(projectPath, 'composer.json');
      expect(existsSync(composerJsonPath)).toBeTruthy();
      
      // Verify composer.json content
      const composerJson = JSON.parse(readFileSync(composerJsonPath, 'utf-8'));
      expect(composerJson.name).toBe(projectName);
      expect(composerJson.type).toBe('library');
      expect(composerJson.require.php).toBe('^8.1');
      expect(composerJson['require-dev']['phpunit/phpunit']).toBe('^10.0');
      expect(composerJson.autoload['psr-4']['MyPhpunitLib\\']).toBe('src/');

      // Check that phpunit.xml was created
      const phpunitXmlPath = join(projectPath, 'phpunit.xml');
      expect(existsSync(phpunitXmlPath)).toBeTruthy();
      
      const phpunitXmlContent = readFileSync(phpunitXmlPath, 'utf-8');
      expect(phpunitXmlContent).toContain('<phpunit');
      expect(phpunitXmlContent).toContain('<testsuites>');
      expect(phpunitXmlContent).toContain('Unit');
      expect(phpunitXmlContent).toContain('Feature');

      // Check that sample PHP class was created
      const calculatorPath = join(projectPath, 'src', 'Calculator.php');
      expect(existsSync(calculatorPath)).toBeTruthy();
      
      const calculatorContent = readFileSync(calculatorPath, 'utf-8');
      expect(calculatorContent).toContain('namespace MyPhpunitLib;');
      expect(calculatorContent).toContain('class Calculator');

      // Check that sample test was created
      const testPath = join(projectPath, 'tests', 'Unit', 'CalculatorTest.php');
      expect(existsSync(testPath)).toBeTruthy();
      
      const testContent = readFileSync(testPath, 'utf-8');
      expect(testContent).toContain('namespace MyPhpunitLib\\Tests\\Unit;');
      expect(testContent).toContain('use MyPhpunitLib\\Calculator;');
      expect(testContent).toContain('class CalculatorTest');

      // Check that README.md was created
      const readmePath = join(projectPath, 'README.md');
      expect(existsSync(readmePath)).toBeTruthy();
      
      const readmeContent = readFileSync(readmePath, 'utf-8');
      expect(readmeContent).toContain(`# ${projectName}`);
      expect(readmeContent).toContain('PHPUnit testing enabled');
    });

    it('should automatically detect PHPUnit configuration and create phpunit target', () => {
      const projectName = 'auto-detected-phpunit';
      
      // Generate a phpunit project
      execSync(`npx nx g @nx-php/phpunit:project ${projectName}`, {
        cwd: projectDirectory,
        stdio: 'inherit',
      });

      // Configure the plugin in nx.json
      const nxJsonPath = join(projectDirectory, 'nx.json');
      const nxJson = JSON.parse(readFileSync(nxJsonPath, 'utf-8'));
      
      if (!nxJson.plugins) {
        nxJson.plugins = [];
      }
      
      // Add phpunit plugin if not already present
      if (!nxJson.plugins.includes('@nx-php/phpunit')) {
        nxJson.plugins.push('@nx-php/phpunit');
      }
      
      require('fs').writeFileSync(nxJsonPath, JSON.stringify(nxJson, null, 2));

      // Reset the project graph cache to ensure fresh discovery
      execSync(`npx nx reset`, {
        cwd: projectDirectory,
        stdio: 'inherit',
      });

      // Verify the phpunit target was automatically created
      const showProjectOutput = execSync(`npx nx show project ${projectName}`, {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });
      
      // Should show the project details with phpunit target
      expect(showProjectOutput).toContain(projectName);
      expect(showProjectOutput).toContain('phpunit');

      // Verify project is tagged with phpunit
      expect(showProjectOutput).toContain('phpunit');
    });

    it('should generate phpunit project with directory option', () => {
      const projectName = 'phpunit-in-subdir';
      const directory = 'test-libs';
      
      // Generate a phpunit project in a subdirectory
      execSync(`npx nx g @nx-php/phpunit:project ${projectName} --directory=${directory}`, {
        cwd: projectDirectory,
        stdio: 'inherit',
      });

      // Check that the project was created in the correct directory
      const projectPath = join(projectDirectory, 'packages', directory, projectName);
      expect(existsSync(projectPath)).toBeTruthy();
      
      // Check that phpunit.xml was created
      const phpunitXmlPath = join(projectPath, 'phpunit.xml');
      expect(existsSync(phpunitXmlPath)).toBeTruthy();
      
      // Check that composer.json was created
      const composerJsonPath = join(projectPath, 'composer.json');
      expect(existsSync(composerJsonPath)).toBeTruthy();
      
      // Verify composer.json content
      const composerJson = JSON.parse(readFileSync(composerJsonPath, 'utf-8'));
      expect(composerJson.name).toBe(projectName);
      expect(composerJson['require-dev']['phpunit/phpunit']).toBeDefined();
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
