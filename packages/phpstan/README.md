# PHPStan Plugin

The `@nx-php/phpstan` plugin automatically discovers and registers PHPStan projects in your Nx workspace by scanning for PHPStan configuration files.

## How It Works

The plugin scans your workspace for PHPStan configuration files and automatically registers them as Nx projects. Each discovered project is configured with:

### Project Configuration
- **Project Name**: Derived from the directory path containing the PHPStan configuration file
- **Project Type**: Set to `library` for all discovered projects
- **Root**: Set to the directory containing the PHPStan configuration file
- **Tags**: All projects are tagged with `phpstan`

### PHPStan Configuration Detection

The plugin looks for the following configuration files (in order of preference):
- `phpstan.neon`
- `phpstan.neon.dist` 
- `phpstan.json`
- `phpstan.json.dist`
- `phpstan.php`
- `phpstan.php.dist`

### Available Targets

Each discovered project gets a `phpstan` target:

- **`phpstan`**: Runs `vendor/bin/phpstan analyze --configuration={config_file}` with proper caching and dependency tracking

## Example Workspace Layout

```
workspace/
├── packages/
│   └── my-library/
│       ├── phpstan.neon
│       ├── composer.json
│       └── src/
├── apps/
│   └── my-app/
│       ├── phpstan.neon.dist
│       ├── composer.json
│       └── src/
└── vendor/
    └── some-package/
        └── composer.json  # No PHPStan config, so no target created
```

## Example PHPStan Configuration Files

### phpstan.neon
```yaml
parameters:
    level: 8
    paths:
        - src
    excludePaths:
        - src/legacy/*
```

### phpstan.json
```json
{
    "parameters": {
        "level": 8,
        "paths": ["src"],
        "excludePaths": ["src/legacy/*"]
    }
}
```

### phpstan.php
```php
<?php
return [
    'parameters' => [
        'level' => 8,
        'paths' => ['src'],
        'excludePaths' => ['src/legacy/*'],
    ],
];
```

## Usage

Once the plugin is configured, you can use standard Nx commands:

```bash
# List all projects (including discovered PHPStan projects)
nx show projects

# Run PHPStan analysis for a specific project
nx phpstan my-library

# Run PHPStan analysis for all projects with PHPStan configuration
nx run-many --target=phpstan --projects=tag:phpstan

# Run PHPStan analysis for all projects
nx run-many --target=phpstan
```

## Plugin Configuration

Add the plugin to your `nx.json`:

```json
{
  "plugins": [
    "@nx-php/phpstan"
  ]
}
```

The plugin will automatically discover new PHPStan configuration files when they are added to the workspace.

## Caching

The PHPStan target is configured with intelligent caching based on:
- All PHP files in the project (`{projectRoot}/**/*.php`)
- The PHPStan configuration file
- `composer.json` and `composer.lock` files (for dependency tracking)

This ensures that PHPStan analysis is only re-run when relevant files change.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: PHPStan Analysis
on: [push, pull_request]

jobs:
  phpstan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: composer install --no-dev --optimize-autoloader
      
      # Run PHPStan analysis for all projects
      - run: nx run-many --target=phpstan --projects=tag:phpstan
```

## Advanced Configuration

### Custom PHPStan Target Options

You can customize the PHPStan target behavior by configuring target defaults in your `nx.json`:

```json
{
  "targetDefaults": {
    "phpstan": {
      "options": {
        "command": "vendor/bin/phpstan analyze --configuration=phpstan.neon --memory-limit=1G"
      }
    }
  }
}
```

### Project-Specific Overrides

For project-specific PHPStan configuration, you can override the target in individual `project.json` files:

```json
{
  "targets": {
    "phpstan": {
      "executor": "nx:run-commands",
      "options": {
        "command": "vendor/bin/phpstan analyze --configuration=phpstan.neon --level=max"
      }
    }
  }
}
```
