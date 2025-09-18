# PHPUnit Demo Project

This is a sample PHP project that demonstrates the `@nx-php/phpunit` plugin functionality.

## Project Structure

```
phpunit-demo/
├── composer.json       # Composer configuration
├── phpunit.xml         # PHPUnit configuration (detected by plugin)
├── src/                # Source code
│   ├── Calculator.php
│   └── StringHelper.php
└── tests/              # Test files
    ├── Unit/           # Unit tests
    │   ├── CalculatorTest.php
    │   └── StringHelperTest.php
    └── Feature/        # Integration tests
        └── IntegrationTest.php
```

## Features Demonstrated

1. **PHPUnit Configuration Detection**: The plugin automatically detects `phpunit.xml`
2. **Target Registration**: A `phpunit` target is automatically added to this project
3. **Test Organization**: Tests are organized into Unit and Feature test suites
4. **Data Providers**: Example of using PHPUnit data providers
5. **Exception Testing**: Testing exception handling
6. **Coverage Configuration**: PHPUnit is configured for coverage reports

## Usage

Once the `@nx-php/phpunit` plugin is installed, you can run tests for this project using:

```bash
# Run all tests
nx phpunit phpunit-demo

# Run with coverage
nx phpunit phpunit-demo -- --coverage-text

# Run only unit tests
nx phpunit phpunit-demo -- --testsuite Unit

# Run only feature tests  
nx phpunit phpunit-demo -- --testsuite Feature

# Run specific test file
nx phpunit phpunit-demo -- tests/Unit/CalculatorTest.php

# Run tests matching a pattern
nx phpunit phpunit-demo -- --filter Calculator
```

## Classes

### Calculator
A simple calculator class with basic arithmetic operations:
- Addition, subtraction, multiplication, division
- Power calculation
- Division by zero protection

### StringHelper
String manipulation utilities:
- String reversal
- Palindrome detection
- Word counting
- Capitalization

## Tests

- **Unit Tests**: Test individual classes in isolation
- **Feature Tests**: Test integration between classes
- **Data Providers**: Demonstrate testing with multiple input sets
- **Exception Testing**: Verify proper error handling