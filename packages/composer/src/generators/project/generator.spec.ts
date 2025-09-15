import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import generator from './generator';
import { ComposerProjectGeneratorSchema } from './schema';

describe('composer-project generator', () => {
  let tree: Tree;
  const options: ComposerProjectGeneratorSchema = { name: 'test' };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generator(tree, options);
    const config = readProjectConfiguration(tree, 'test');
    expect(config).toBeDefined();
  });

  it('should create project configuration', async () => {
    await generator(tree, options);
    const config = readProjectConfiguration(tree, 'test');
    
    expect(config.root).toBe('packages/test');
    expect(config.projectType).toBe('library');
    expect(config.sourceRoot).toBe('packages/test/src');
    expect(config.targets?.install).toBeDefined();
    expect(config.targets?.test).toBeDefined();
  });

  it('should create composer.json', async () => {
    await generator(tree, options);
    
    expect(tree.exists('packages/test/composer.json')).toBeTruthy();
    const composerJson = JSON.parse(tree.read('packages/test/composer.json', 'utf-8') || '{}');
    expect(composerJson.name).toBe('test');
    expect(composerJson.type).toBe('library');
    expect(composerJson.require.php).toBeDefined();
  });

  it('should create README.md', async () => {
    await generator(tree, options);
    
    expect(tree.exists('packages/test/README.md')).toBeTruthy();
    const readme = tree.read('packages/test/README.md', 'utf-8');
    expect(readme).toContain('# test');
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