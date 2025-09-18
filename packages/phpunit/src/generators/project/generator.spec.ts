import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import generator from './generator';
import { PhpunitProjectGeneratorSchema } from './schema';

describe('phpunit-project generator', () => {
  let tree: Tree;
  const options: PhpunitProjectGeneratorSchema = { name: 'test' };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generator(tree, options);
    const config = readProjectConfiguration(tree, 'test');
    expect(config).toBeDefined();
  });

  it('should create project configuration without targets', async () => {
    await generator(tree, options);
    const config = readProjectConfiguration(tree, 'test');
    
    expect(config.root).toBe('packages/test');
    expect(config.projectType).toBe('library');
    expect(config.sourceRoot).toBe('packages/test/src');
    // Targets should not be defined here - they'll be added by the plugin
    expect(config.targets).toBeUndefined();
  });

  it('should create composer.json with PHPUnit dependency', async () => {
    await generator(tree, options);
    
    expect(tree.exists('packages/test/composer.json')).toBeTruthy();
    const composerJson = JSON.parse(tree.read('packages/test/composer.json', 'utf-8') || '{}');
    expect(composerJson.name).toBe('test');
    expect(composerJson['require-dev']['phpunit/phpunit']).toBeDefined();
  });

  it('should create phpunit.xml configuration', async () => {
    await generator(tree, options);
    
    expect(tree.exists('packages/test/phpunit.xml')).toBeTruthy();
    const phpunitXml = tree.read('packages/test/phpunit.xml', 'utf-8');
    expect(phpunitXml).toContain('<phpunit');
    expect(phpunitXml).toContain('<testsuites>');
  });

  it('should create README.md', async () => {
    await generator(tree, options);
    
    expect(tree.exists('packages/test/README.md')).toBeTruthy();
    const readme = tree.read('packages/test/README.md', 'utf-8');
    expect(readme).toContain('# test');
    expect(readme).toContain('PHPUnit testing enabled');
  });

  it('should create sample PHP class and test', async () => {
    await generator(tree, options);
    
    expect(tree.exists('packages/test/src/Calculator.php')).toBeTruthy();
    expect(tree.exists('packages/test/tests/Unit/CalculatorTest.php')).toBeTruthy();
    
    const calculatorClass = tree.read('packages/test/src/Calculator.php', 'utf-8');
    expect(calculatorClass).toContain('namespace Test;');
    expect(calculatorClass).toContain('class Calculator');
    
    const calculatorTest = tree.read('packages/test/tests/Unit/CalculatorTest.php', 'utf-8');
    expect(calculatorTest).toContain('namespace Test\\Tests\\Unit;');
    expect(calculatorTest).toContain('use Test\\Calculator;');
  });

  it('should handle directory option', async () => {
    const optionsWithDir = { ...options, directory: 'lib' };
    await generator(tree, optionsWithDir);
    
    const config = readProjectConfiguration(tree, 'lib-test');
    expect(config.root).toBe('packages/lib/test');
  });

  it('should handle tags option', async () => {
    const optionsWithTags = { ...options, tags: 'php,library' };
    await generator(tree, optionsWithTags);
    
    const config = readProjectConfiguration(tree, 'test');
    expect(config.tags).toEqual(['php', 'library']);
  });

  it('should create proper namespace in composer.json', async () => {
    await generator(tree, { name: 'my-package' });
    
    const composerJson = JSON.parse(tree.read('packages/my-package/composer.json', 'utf-8') || '{}');
    expect(composerJson.autoload['psr-4']['MyPackage\\']).toBe('src/');
    expect(composerJson['autoload-dev']['psr-4']['MyPackage\\Tests\\']).toBe('tests/');
  });

  it('should reject invalid project names', async () => {
    await expect(generator(tree, { name: '123invalid' })).rejects.toThrow();
  });
});