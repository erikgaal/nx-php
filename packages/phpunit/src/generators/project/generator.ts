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
import { PhpunitProjectGeneratorSchema } from './schema';

interface NormalizedSchema extends PhpunitProjectGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  namespace: string;
}

function normalizeOptions(
  tree: Tree,
  options: PhpunitProjectGeneratorSchema
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

export default async function (tree: Tree, options: PhpunitProjectGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);

  // Note: We don't create targets here as they will be automatically detected
  // by the @nx-php/phpunit plugin when it scans for phpunit.xml files
  const projectConfiguration: ProjectConfiguration = {
    root: normalizedOptions.projectRoot,
    projectType: 'library',
    sourceRoot: `${normalizedOptions.projectRoot}/src`,
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