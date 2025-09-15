import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';

describe('nx-php', () => {
  let projectDirectory: string;

  beforeAll(() => {
    projectDirectory = createTestProject();

    // The plugin has been built and published to a local registry in the jest globalSetup
    // Install the plugins built with the latest source code into the test repo
    execSync(`npm install -D nx-php@e2e @nx-php/composer@e2e`, {
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
