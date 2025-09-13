# @nx-php/composer

An Nx plugin for Composer-based PHP projects. This plugin automatically discovers Composer projects in your workspace and integrates them with the Nx build system.

## Features

- **Automatic Project Discovery**: Scans the workspace for `composer.json` files and registers them as Nx projects
- **Project Type Detection**: Automatically determines if a project is a library or application based on composer.json metadata
- **Target Generation**: Creates Nx targets for all Composer scripts plus standard install/update operations
- **Nx Integration**: Full integration with Nx project graph, caching, and task orchestration

## Installation

```bash
npm install @nx-php/composer
```

## Usage

Add the plugin to your `nx.json`:

```json
{
  "plugins": ["@nx-php/composer"]
}
```

The plugin will automatically discover all Composer projects in your workspace. For each `composer.json` file found, it will:

1. Parse the project metadata (name, type, scripts)
2. Register the project in the Nx project graph
3. Create targets for all defined scripts
4. Add default `install` and `update` targets

## Project Discovery

The plugin scans for `composer.json` files in:
- Root directory: `./composer.json`
- Any subdirectory: `**/composer.json`

Excluded directories: `node_modules`, `.git`, `dist`, `tmp`, `.nx`

## Project Types

- **Library**: Projects with `"type": "library"` in composer.json (default)
- **Application**: Projects with scripts like `start`, `serve`, `dev`, or `watch`

## Generated Targets

For each discovered project, the following targets are created:

### Standard Targets
- `install`: Run `composer install`
- `update`: Run `composer update`

### Script-based Targets
For each script defined in `composer.json`, a corresponding target is created:

```json
{
  "scripts": {
    "test": "phpunit",
    "lint": "php-cs-fixer fix"
  }
}
```

Becomes:
- `test`: Run `composer test` 
- `lint`: Run `composer lint`

## Example

Given this workspace structure:

```
workspace/
├── apps/
│   └── web-app/
│       └── composer.json  <- PHP application
├── packages/
│   ├── core-lib/
│   │   └── composer.json  <- PHP library  
│   └── utils-lib/
│       └── composer.json  <- PHP library
└── nx.json
```

The plugin will register three PHP projects:
- `web-app` (application)
- `core-lib` (library) 
- `utils-lib` (library)

Run Nx commands on these projects:

```bash
# Install dependencies for all PHP projects
nx run-many -t install

# Run tests for a specific project
nx run core-lib:test

# Run all test targets across projects
nx run-many -t test
```

## Building

Run `nx build composer` to build the library.

## Running unit tests

Run `nx test composer` to execute the unit tests via [Jest](https://jestjs.io).
