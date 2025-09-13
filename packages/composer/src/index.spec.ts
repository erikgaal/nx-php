import { CreateNodesContext, CreateNodesResult } from '@nx/devkit';
import { createNodes } from './index';
import { ComposerJson } from './models/composer-json';
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('fs');
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

describe('@nx-php/composer', () => {
  const mockWorkspaceRoot = '/workspace';
  
  let context: CreateNodesContext;

  beforeEach(() => {
    context = {
      workspaceRoot: mockWorkspaceRoot,
      configFiles: [],
      nxJsonConfiguration: {},
    };
    
    jest.clearAllMocks();
  });

  describe('createNodes', () => {
    it('should return empty object for non-composer.json files', () => {
      const result = createNodes('package.json', {}, context);
      expect(result).toEqual({});
    });

    it('should return empty object when composer.json cannot be parsed', () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = createNodes('composer.json', {}, context);
      expect(result).toEqual({});
    });

    it('should create project configuration for valid composer.json', () => {
      const composerJson: ComposerJson = {
        name: 'test/library',
        type: 'library',
        description: 'A test library',
        version: '1.0.0',
        require: {
          'php': '^8.0',
        },
        scripts: {
          test: 'phpunit',
          'test:coverage': 'phpunit --coverage-html coverage',
        },
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(composerJson));

      const result = createNodes('packages/test-lib/composer.json', {}, context);

      expect(result).toEqual({
        projects: {
          'packages/test-lib': {
            name: 'test/library',
            root: 'packages/test-lib',
            projectType: 'library',
            sourceRoot: 'packages/test-lib',
            tags: ['php', 'composer'],
          },
        },
      });
    });

    it('should detect application project type based on scripts', () => {
      const composerJson: ComposerJson = {
        name: 'test/app',
        scripts: {
          start: 'php -S localhost:8000',
          serve: 'php artisan serve',
        },
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(composerJson));

      const result = createNodes('apps/test-app/composer.json', {}, context) as CreateNodesResult;

      expect(result.projects?.['apps/test-app'].projectType).toBe('application');
    });

    it('should use directory name when composer name is not available', () => {
      const composerJson: ComposerJson = {
        version: '1.0.0',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(composerJson));

      const result = createNodes('packages/unnamed-lib/composer.json', {}, context) as CreateNodesResult;

      expect(result.projects?.['packages/unnamed-lib'].name).toBe('unnamed-lib');
    });

    it('should handle root composer.json', () => {
      const composerJson: ComposerJson = {
        name: 'root/project',
        type: 'project',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(composerJson));

      const result = createNodes('composer.json', {}, context) as CreateNodesResult;

      expect(result.projects?.['.'].name).toBe('root/project');
      expect(result.projects?.['.'].root).toBe('.');
    });
  });
});