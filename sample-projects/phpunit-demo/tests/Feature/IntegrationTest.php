<?php

declare(strict_types=1);

namespace Sample\PhpunitDemo\Tests\Feature;

use PHPUnit\Framework\TestCase;
use Sample\PhpunitDemo\Calculator;
use Sample\PhpunitDemo\StringHelper;

class IntegrationTest extends TestCase
{
    /**
     * This is a feature test that tests interaction between multiple classes
     */
    public function testCalculatorAndStringHelperIntegration(): void
    {
        $calculator = new Calculator();
        $stringHelper = new StringHelper();
        
        // Calculate a result
        $result = $calculator->add(2, 3);
        
        // Convert to string and reverse it
        $resultString = (string) $result;
        $reversed = $stringHelper->reverse($resultString);
        
        // Verify the integration
        $this->assertEquals(5, $result);
        $this->assertEquals('5', $reversed); // '5' reversed is still '5'
    }

    public function testComplexCalculations(): void
    {
        $calculator = new Calculator();
        
        // Test a chain of calculations
        $step1 = $calculator->add(10, 5);    // 15
        $step2 = $calculator->multiply($step1, 2);  // 30
        $step3 = $calculator->subtract($step2, 5);  // 25
        $step4 = $calculator->divide($step3, 5);    // 5
        
        $this->assertEquals(15, $step1);
        $this->assertEquals(30, $step2);
        $this->assertEquals(25, $step3);
        $this->assertEquals(5, $step4);
    }

    public function testStringOperationsChain(): void
    {
        $stringHelper = new StringHelper();
        
        $original = 'hello world';
        $capitalized = $stringHelper->capitalize($original);
        $wordCount = $stringHelper->wordCount($capitalized);
        
        $this->assertEquals('Hello World', $capitalized);
        $this->assertEquals(2, $wordCount);
    }
}