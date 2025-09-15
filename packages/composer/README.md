# Composer Project Discovery

The `@nx-php/composer` plugin automatically discovers and registers Composer projects in your Nx workspace by scanning for `composer.json` files.

## How It Works

The plugin scans your workspace for any `composer.json` files and automatically registers them as Nx projects. Each discovered project is configured with:

### Project Configuration
- **Project Name**: Derived from the `name` field in `composer.json`, or the directory name if no name is specified
- **Project Type**: Determined automatically:
  - `library` for packages marked with `"type": "library"` or packages without dev dependencies/scripts
  - `application` for packages with `require-dev` dependencies or composer scripts
- **Source Root**: Configured based on PSR-4 autoload configuration, defaults to `src/`
- **Tags**: Generated from composer `type` and `keywords` fields

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
│   └── my-library/
│       └── composer.json
├── apps/
│   └── my-app/
│       └── composer.json
└── vendor/
    └── some-package/
        └── composer.json
```

## Example composer.json Files

### Library Project
```json
{
  "name": "example/my-library",
  "type": "library",
  "description": "A sample PHP library",
  "keywords": ["php", "library"],
  "require": {
    "php": "^8.0"
  },
  "require-dev": {
    "phpunit/phpunit": "^9.0"
  },
  "autoload": {
    "psr-4": {
      "Example\\MyLibrary\\": "src/"
    }
  }
}
```

### Application Project
```json
{
  "name": "example/my-app",
  "description": "A sample PHP application",
  "require": {
    "php": "^8.0"
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

## Usage

Once the plugin is configured, you can use standard Nx commands:

```bash
# List all projects (including discovered Composer projects)
nx show projects

# Run composer install for a specific project
nx install my-library

# Run tests for all Composer projects
nx run-many --target=test --projects=tag:composer:library

# Validate all composer.json files
nx run-many --target=validate
```

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