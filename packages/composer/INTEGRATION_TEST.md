# Manual Integration Test

This document demonstrates how to manually validate the Composer plugin works correctly.

## Test Setup

The workspace already contains two example Composer projects:

1. **Demo Library** (`packages/demo-lib/`)
   - Type: library
   - Scripts: test, test:coverage, lint, format

2. **Demo App** (`apps/demo-app/`)
   - Type: application (detected by start/serve scripts)
   - Scripts: start, serve, dev, test, build

## Validation Steps

### 1. Project Discovery

```bash
# Should show: composer, demo/library, demo/app, @nx-php/source
nx show projects
```

### 2. Project Details

```bash
# View library project details
nx show project demo/library

# View application project details  
nx show project demo/app
```

### 3. Run Targets

```bash
# Install dependencies (library)
nx run demo/library:install --dry-run

# Install dependencies (app)
nx run demo/app:install --dry-run

# Run custom scripts
nx run demo/library:test --dry-run
nx run demo/app:start --dry-run
nx run demo/library:lint --dry-run
```

### 4. Nx Graph Integration

```bash
# Verify projects appear in the graph
nx graph
```

### 5. Batch Operations

```bash
# Install all Composer projects
nx run-many -t install

# Run tests across all projects that have test target
nx run-many -t test
```

## Expected Results

- ✅ All Composer projects are discovered automatically
- ✅ Project types are correctly detected (library vs application)
- ✅ All composer.json scripts become Nx targets
- ✅ Standard install/update targets are added
- ✅ Projects integrate with Nx graph and task orchestration
- ✅ PHP commands execute correctly through Nx