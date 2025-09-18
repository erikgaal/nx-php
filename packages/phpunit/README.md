# @nx-php/phpunit

The `@nx-php/phpunit` plugin automatically detects PHPUnit configurations in your Nx workspace and registers `phpunit` targets for projects that have PHPUnit enabled.

## How It Works

The plugin scans your workspace for projects that have PHPUnit configuration files and automatically adds a `phpunit` target to run tests through Nx.

### Supported PHPUnit Configuration Files

The plugin detects the following PHPUnit configuration files (in order of priority):

1. `phpunit.xml`
2. `phpunit.xml.dist`
3. `phpunit.dist.xml`
4. `.phpunit.xml`
5. `.phpunit.xml.dist`
6. `phpunit.config.xml`

### Automatic Target Registration

For each project with a PHPUnit configuration file, the plugin registers a `phpunit` target with the following configuration:

- **Executor**: `nx:run-commands`
- **Command**: `vendor/bin/phpunit --configuration <config-file>`
- **Working Directory**: The project root
- **Tags**: `phpunit`

## Usage

### Installation

Add the plugin to your `nx.json`:

```json
{
  "plugins": [
    "@nx-php/phpunit"
  ]
}
```

### Running Tests

Once configured, you can run PHPUnit tests using standard Nx commands:

```bash
# Run tests for a specific project
nx phpunit my-project

# Run tests for all projects with PHPUnit
nx run-many --target=phpunit

# Run tests for specific tagged projects
nx run-many --target=phpunit --projects=tag:phpunit
```

### PHPUnit Options

The `phpunit` target supports common PHPUnit options:

```bash
# Run tests with coverage
nx phpunit my-project -- --coverage-text

# Run specific test methods or classes
nx phpunit my-project -- --filter TestClassName::testMethodName

# Run tests from specific groups
nx phpunit my-project -- --group unit

# Run specific test suite
nx phpunit my-project -- --testsuite Unit
```

## Example Project Structure

```
workspace/
├── my-library/
│   ├── composer.json
│   ├── phpunit.xml              # ← PHPUnit config detected
│   ├── src/
│   │   └── MyLibrary.php
│   └── tests/
│       └── MyLibraryTest.php
├── another-project/
│   ├── composer.json
│   ├── phpunit.xml.dist         # ← PHPUnit config detected
│   └── src/
│       └── AnotherClass.php
└── no-tests-project/
    ├── composer.json            # ← No PHPUnit config, no target added
    └── src/
        └── SomeClass.php
```

After the plugin processes these projects:

```bash
# Available commands:
nx phpunit my-library          # ✅ Uses phpunit.xml
nx phpunit another-project     # ✅ Uses phpunit.xml.dist  
nx phpunit no-tests-project    # ❌ No PHPUnit target available
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  phpunit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: mbstring, xml, ctype, json
          
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - run: npm ci
      
      # Install PHP dependencies for all projects
      - run: npx nx run-many --target=install --projects=tag:composer:library
      
      # Run PHPUnit tests for all projects with PHPUnit
      - run: npx nx run-many --target=phpunit --projects=tag:phpunit
```

## Advanced Configuration

### Custom PHPUnit Commands

You can override the default PHPUnit command for specific projects by adding a `project.json` file:

```json
{
  "name": "my-project",
  "targets": {
    "phpunit": {
      "executor": "nx:run-commands",
      "options": {
        "command": "vendor/bin/phpunit --configuration phpunit.xml --coverage-clover coverage.xml",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

### Target Dependencies

You can add dependencies between targets using `dependsOn` in your workspace configuration:

```json
{
  "targetDefaults": {
    "phpunit": {
      "dependsOn": ["install"]
    }
  }
}
```

This ensures Composer dependencies are installed before running tests.

## Troubleshooting

### Tests Not Detected

If your PHPUnit tests aren't being detected:

1. **Check PHPUnit config file**: Ensure you have one of the supported configuration files in your project root
2. **Verify file naming**: The config file must match exactly one of the supported patterns
3. **Check project structure**: The PHPUnit config should be in the same directory as `composer.json`

### PHPUnit Not Found

If you get "command not found" errors:

1. **Install PHPUnit**: Add PHPUnit to your `composer.json`:
   ```json
   {
     "require-dev": {
       "phpunit/phpunit": "^10.0"
     }
   }
   ```

2. **Run Composer install**: Ensure dependencies are installed:
   ```bash
   nx install my-project  # or composer install in project directory
   ```

### Custom PHPUnit Location

If PHPUnit is installed globally or in a custom location, override the command:

```json
{
  "targets": {
    "phpunit": {
      "executor": "nx:run-commands",
      "options": {
        "command": "phpunit --configuration phpunit.xml"
      }
    }
  }
}
```

## Contributing

This plugin follows the same patterns as other Nx PHP plugins. See the main repository for contribution guidelines.
