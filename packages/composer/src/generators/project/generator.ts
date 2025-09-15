import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  names,
  offsetFromRoot,
  ProjectConfiguration,
  Tree,
} from '@nx/devkit';
import * as path from 'path';
import { ComposerProjectGeneratorSchema } from './schema';

interface NormalizedSchema extends ComposerProjectGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  namespace: string;
}

function normalizeOptions(
  tree: Tree,
  options: ComposerProjectGeneratorSchema
): NormalizedSchema {
  const name = names(options.name).fileName;
  
  // Validate project name
  if (!name.match(/^[a-zA-Z]/)) {
    throw new Error(`Invalid project name "${options.name}". Project names must start with a letter.`);
  }
  
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;
  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const projectRoot = `packages/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  // Create a namespace from the project name
  const namespace = names(options.name).className;

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    namespace,
  };
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    options.projectRoot,
    templateOptions
  );
}

export default async function (tree: Tree, options: ComposerProjectGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);

  const projectConfiguration: ProjectConfiguration = {
    root: normalizedOptions.projectRoot,
    projectType: 'library',
    sourceRoot: `${normalizedOptions.projectRoot}/src`,
    targets: {
      install: {
        executor: 'nx:run-commands',
        options: {
          command: 'composer install',
          cwd: normalizedOptions.projectRoot,
        },
      },
      test: {
        executor: 'nx:run-commands',
        options: {
          command: 'vendor/bin/phpunit',
          cwd: normalizedOptions.projectRoot,
        },
        dependsOn: ['install'],
      },
    },
    tags: normalizedOptions.parsedTags,
  };

  addProjectConfiguration(
    tree,
    normalizedOptions.projectName,
    projectConfiguration
  );

  addFiles(tree, normalizedOptions);
  await formatFiles(tree);
}