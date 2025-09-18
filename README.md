# Nx PHP

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

**Nx plugins for PHP development with Composer project management**

This repository provides Nx plugins that bring powerful monorepo capabilities to PHP projects, with automatic Composer project discovery and seamless integration with Nx's build system.

## Features

✨ **Automatic Composer Project Discovery** - Automatically detects and registers Composer projects in your workspace  
🚀 **Project Generation** - Create new PHP libraries and applications with proper PSR-4 structure  
🏗️ **Nx Integration** - Full integration with Nx commands for running tasks across multiple projects  
🧪 **PHPUnit Testing** - Automatic detection of PHPUnit configurations and test target registration  
📦 **Dependency Management** - Intelligent handling of Composer dependencies and scripts  
🏷️ **Smart Tagging** - Automatic project tagging based on Composer metadata

## Quick Start

### Installation

Create a new Nx workspace or add to an existing one:

```bash
# Create new workspace
npx create-nx-workspace@latest my-php-workspace --preset=apps --nxCloud=skip

cd my-php-workspace

# Install the PHP Composer plugin
npm install -D @nx-php/composer

# Install the PHPUnit plugin for automatic test target registration
npm install -D @nx-php/phpunit
```

### Configuration

Add the plugin to your `nx.json`:

```json
{
  "plugins": [
    "@nx-php/composer",
    "@nx-php/phpunit"
  ]
}
```

### Generate Your First PHP Project

```bash
# Create a PHP library
npx nx g @nx-php/composer:project my-library

# Create a PHP library in a specific directory
npx nx g @nx-php/composer:project my-app --directory=apps
```

## Project Discovery

The `@nx-php/composer` plugin automatically discovers existing Composer projects by scanning for `composer.json` files. Each discovered project is configured with:

### Automatic Configuration
- **Project Name**: Derived from composer.json `name` field or directory name
- **Project Type**: Auto-detected as `library` or `application` based on composer metadata
- **Source Root**: Configured from PSR-4 autoload paths (defaults to `src/`)  
- **Tags**: Generated from composer `type` and `keywords` fields

### Generated Projects vs Discovered Projects

**Generated Projects** (created with `npx nx g @nx-php/composer:project`) include these built-in targets:
- **`install`**: Runs `composer install`
- **`test`**: Runs `vendor/bin/phpunit` (depends on install)

**Discovered Projects** (existing composer.json files) are automatically registered as Nx projects but don't include default targets. You can add custom targets to any project via workspace configuration.

## PHPUnit Testing

The `@nx-php/phpunit` plugin automatically detects PHPUnit configurations and adds `phpunit` targets to projects that have PHPUnit enabled.

### Automatic PHPUnit Detection

The plugin scans for these PHPUnit configuration files (in order of priority):
- `phpunit.xml`
- `phpunit.xml.dist`  
- `phpunit.dist.xml`
- `.phpunit.xml`
- `.phpunit.xml.dist`
- `phpunit.config.xml`

### PHPUnit Target Features

For projects with PHPUnit configuration, the plugin automatically adds a `phpunit` target with:

- **Command**: `vendor/bin/phpunit --configuration <config-file>`
- **Working Directory**: Project root
- **Tags**: `phpunit` (for easy filtering)
- **Help Information**: Built-in help with common PHPUnit options

### PHPUnit Usage Examples

```bash
# Run PHPUnit tests for a specific project
npx nx phpunit my-library

# Run tests with coverage
npx nx phpunit my-library -- --coverage-text

# Run specific test suite
npx nx phpunit my-library -- --testsuite Unit

# Run tests matching a pattern
npx nx phpunit my-library -- --filter Calculator

# Run PHPUnit tests for all projects with PHPUnit
npx nx run-many --target=phpunit --projects=tag:phpunit
```

## Usage Examples

### Working with Generated Projects

```bash
# List all projects (including discovered Composer projects)
npx nx show projects

# Install dependencies for a generated project  
npx nx install my-library

# Run tests for generated projects
npx nx test my-library

# Run tests for multiple generated projects
npx nx run-many --target=test --projects=my-lib1,my-lib2
```

### Working with Discovered Projects

For discovered projects (existing composer.json files), you can run Composer commands directly:

```bash
# Run composer commands for specific projects
npx nx run-commands --cwd=packages/existing-lib -- composer install
npx nx run-commands --cwd=packages/existing-lib -- composer test

# Or create custom workspace targets (see Advanced Usage section)
```

### Project Organization

```bash
# List projects by tags
npx nx show projects --with-tag=composer:library
npx nx show projects --with-tag=keyword:api

# Run commands on tagged projects
npx nx run-many --target=test --projects=tag:composer:library
```

### Project Graph Visualization

```bash
# Visualize your project dependencies
npx nx graph
```

## Workspace Structure

A typical PHP workspace with the Composer plugin looks like this:

```
my-php-workspace/
├── packages/
│   ├── my-library/
│   │   ├── composer.json
│   │   ├── src/
│   │   └── tests/
│   └── shared-utils/
│       ├── composer.json
│       └── src/
├── apps/
│   └── my-app/
│       ├── composer.json
│       ├── bin/
│       └── src/
├── vendor/               # Composer global dependencies
├── nx.json              # Nx configuration with PHP plugins
└── composer.json        # Workspace-level composer.json (optional)
```

## Sample composer.json Files

### Library Project

```json
{
  "name": "my-org/useful-library",
  "type": "library",
  "description": "A useful PHP library",
  "keywords": ["php", "library", "utilities"],
  "require": {
    "php": "^8.0"
  },
  "require-dev": {
    "phpunit/phpunit": "^10.0"
  },
  "autoload": {
    "psr-4": {
      "MyOrg\\UsefulLibrary\\": "src/"
    }
  }
}
```

### Application Project

```json
{
  "name": "my-org/web-app", 
  "type": "project",
  "description": "A PHP web application",
  "require": {
    "php": "^8.0",
    "my-org/useful-library": "^1.0"
  },
  "require-dev": {
    "phpunit/phpunit": "^10.0"
  },
  "scripts": {
    "start": "php bin/server.php",
    "test": "vendor/bin/phpunit --coverage-clover coverage.xml"
  }
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
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
      
      # For generated projects with targets
      - run: npx nx run-many --target=install --projects=tag:composer:library
      - run: npx nx run-many --target=test --projects=tag:composer:library
      
      # For discovered projects, use custom targets or direct commands
      - run: npx nx run-many --target=composer-install --all
      - run: npx nx run-many --target=composer-test --all
```

## Advanced Usage

### Adding Targets to Discovered Projects

For discovered Composer projects, you can add targets via workspace configuration. Add to your `nx.json`:

```json
{
  "targetDefaults": {
    "composer-install": {
      "executor": "nx:run-commands",
      "options": {
        "command": "composer install"
      }
    },
    "composer-test": {
      "executor": "nx:run-commands", 
      "options": {
        "command": "vendor/bin/phpunit"
      },
      "dependsOn": ["composer-install"]
    },
    "composer-validate": {
      "executor": "nx:run-commands",
      "options": {
        "command": "composer validate"
      }
    }
  }
}
```

Then run targets across all projects:

```bash
# Install dependencies for all projects
npx nx run-many --target=composer-install --all

# Validate all composer.json files  
npx nx run-many --target=composer-validate --all
```

### Project-Specific Configuration

You can also add targets to specific discovered projects by creating a `project.json` file:

```json
{
  "name": "existing-project",
  "targets": {
    "install": {
      "executor": "nx:run-commands",
      "options": {
        "command": "composer install",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

### Project Tags and Organization

Projects are automatically tagged based on their Composer metadata:

- `composer:library` - For library-type packages
- `composer:project` - For application-type packages  
- `keyword:*` - Based on composer.json keywords

Use these tags to run commands on specific project types:

```bash
# Show only libraries
npx nx show projects --with-tag=composer:library

# Show projects with specific keywords
npx nx show projects --with-tag=keyword:api
```

## Requirements

- **PHP**: 8.0 or higher
- **Node.js**: 18.0 or higher
- **Composer**: 2.0 or higher
- **Nx**: 15.0 or higher

## Available Plugins

- **@nx-php/composer** - Composer project discovery and management

## Development

### Contributing

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the plugins: `npx nx run-many --target=build --all`
4. Run tests: `npx nx run-many --target=test --all`

### Plugin Development

This workspace uses Nx plugin development tools:

```bash
# Generate a new plugin
npx nx g @nx/plugin:plugin my-php-plugin

# Test plugin functionality  
npx nx test my-php-plugin-e2e
```

## Resources & Documentation

### Nx Documentation
- [Nx PHP Plugin Documentation](packages/composer/README.md)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins)
- [Nx Plugin Development](https://nx.dev/extending-nx/intro/getting-started)
- [Project Graph](https://nx.dev/concepts/the-project-graph)

### PHP & Composer Resources
- [Composer Documentation](https://getcomposer.org/doc/)
- [PSR-4 Autoloading](https://www.php-fig.org/psr/psr-4/)
- [PHPUnit Testing Framework](https://phpunit.de/)

### CI/CD & DevOps
- [Nx on CI](https://nx.dev/ci/intro/ci-with-nx)
- [Nx Cloud](https://nx.dev/ci/intro/ci-with-nx)  
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases)

## Community & Support

- [Nx Discord Community](https://go.nx.dev/community)
- [Nx on GitHub](https://github.com/nrwl/nx)
- [Follow Nx on X/Twitter](https://twitter.com/nxdevtools)
- [Nx Blog](https://nx.dev/blog)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ using [Nx](https://nx.dev) - Smart Monorepos · Fast CI
