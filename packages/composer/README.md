# Composer Project Discovery

The `@nx-php/composer` plugin automatically discovers and registers Composer projects in your Nx workspace by scanning for `composer.json` files and parsing their dependencies to build an accurate project graph.

## How It Works

The plugin scans your workspace for any `composer.json` files and automatically:

1. **Registers** them as Nx projects with appropriate configuration
2. **Parses dependencies** from `require` and `require-dev` sections
3. **Creates project graph edges** for internal workspace dependencies
4. **Tracks external dependencies** for future use (e.g., visualization, reporting)

### Project Configuration
- **Project Name**: Derived from the `name` field in `composer.json`, or the directory name if no name is specified
- **Project Type**: Determined automatically:
  - `application` for packages marked with `"type": "project"`
  - `library` for all other package types
- **Source Root**: Configured based on PSR-4 autoload configuration, defaults to `src/`
- **Tags**: Generated from composer `type` and `keywords` fields

### Dependency Resolution

The plugin intelligently resolves dependencies between workspace projects:

- **Internal Dependencies**: Dependencies that reference other projects in the workspace are automatically detected and added as edges in the Nx project graph
- **External Dependencies**: Dependencies on Packagist or other external sources are tracked but don't create graph edges
- **Dependency Matching**: Uses flexible matching to handle different naming patterns:
  - `vendor/package-name` → `vendor-package-name` (project name)
  - `my-workspace/lib-name` → `lib-name` (project name)

### Available Targets

Each discovered project gets the following targets:

- **`install`**: Runs `composer install`
- **`update`**: Runs `composer update` (depends on `install`)
- **`validate`**: Runs `composer validate`
- **`test`**: Runs `vendor/bin/phpunit` (only if PHPUnit is detected or test script exists)

## Example Workspace Layout

```
workspace/
├── packages/
│   ├── shared-library/
│   │   └── composer.json  # "name": "my-workspace/shared-library"
│   └── utils/
│       └── composer.json  # "name": "my-workspace/utils"  
├── apps/
│   └── main-app/
│       └── composer.json  # depends on "my-workspace/shared-library"
```

In this example, the plugin will automatically create a dependency edge from `main-app` to `shared-library` in the Nx project graph.

## Example composer.json Files

### Library Project
```json
{
  "name": "my-workspace/shared-library",
  "type": "library",
  "description": "Shared utilities and components",
  "keywords": ["php", "library", "utilities"],
  "require": {
    "php": "^8.0"
  },
  "require-dev": {
    "phpunit/phpunit": "^9.0"
  },
  "autoload": {
    "psr-4": {
      "MyWorkspace\\SharedLibrary\\": "src/"
    }
  }
}
```

### Application Project with Workspace Dependencies
```json
{
  "name": "my-workspace/main-app", 
  "type": "project",
  "description": "Main application",
  "require": {
    "php": "^8.0",
    "my-workspace/shared-library": "^1.0",
    "my-workspace/utils": "^1.0",
    "symfony/console": "^6.0"
  },
  "require-dev": {
    "phpunit/phpunit": "^9.0"
  },
  "scripts": {
    "start": "php bin/app.php",
    "test": "vendor/bin/phpunit --coverage-clover coverage.xml"
  }
}
```

In this example:
- `my-workspace/shared-library` and `my-workspace/utils` are **internal dependencies** - they create edges in the project graph
- `symfony/console` is an **external dependency** - it's tracked but doesn't create graph edges

## Usage

Once the plugin is configured, you can use standard Nx commands with full dependency graph support:

```bash
# List all projects (including discovered Composer projects)
nx show projects

# Show project dependencies and dependents
nx show project my-app
nx show project shared-library --with-deps

# View the project graph (includes internal dependencies)
nx graph

# Run commands with dependency awareness
nx build main-app  # Will build dependencies first if configured
nx test shared-library  # Run tests for the library

# Run commands for multiple projects based on dependencies
nx affected --target=test  # Test only projects affected by changes
nx run-many --target=build --projects=tag:composer:application

# Validate all composer.json files
nx run-many --target=validate
```

### Nx Graph Integration

The dependency parsing creates a visual project graph that shows:
- Internal dependencies between workspace projects
- Project types (library vs application)
- Dependency flow and relationships

Run `nx graph` to see the interactive dependency visualization.

### Dependency-Aware Commands

With the project graph properly configured, Nx can:
- Run tasks in dependency order
- Skip unchanged projects and their dependencies
- Show which projects are affected by changes
- Optimize task execution with intelligent caching

## Plugin Configuration

Add the plugin to your `nx.json`:

```json
{
  "plugins": [
    "@nx-php/composer"
  ]
}
```

The plugin will automatically discover new `composer.json` files when they are added to the workspace.