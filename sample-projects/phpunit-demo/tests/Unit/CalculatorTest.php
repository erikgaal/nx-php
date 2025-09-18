<?php

declare(strict_types=1);

namespace Sample\PhpunitDemo\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Sample\PhpunitDemo\Calculator;

class CalculatorTest extends TestCase
{
    private Calculator $calculator;

    protected function setUp(): void
    {
        $this->calculator = new Calculator();
    }

    public function testAddition(): void
    {
        $result = $this->calculator->add(2.5, 3.7);
        $this->assertEquals(6.2, $result, '', 0.001);
    }

    public function testSubtraction(): void
    {
        $result = $this->calculator->subtract(10, 4);
        $this->assertEquals(6, $result);
    }

    public function testMultiplication(): void
    {
        $result = $this->calculator->multiply(3, 4);
        $this->assertEquals(12, $result);
    }

    public function testDivision(): void
    {
        $result = $this->calculator->divide(15, 3);
        $this->assertEquals(5, $result);
    }

    public function testDivisionByZero(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Division by zero is not allowed');
        
        $this->calculator->divide(10, 0);
    }

    public function testPower(): void
    {
        $result = $this->calculator->power(2, 3);
        $this->assertEquals(8, $result);
    }

    /**
     * @dataProvider additionProvider
     */
    public function testAdditionWithDataProvider(float $a, float $b, float $expected): void
    {
        $result = $this->calculator->add($a, $b);
        $this->assertEquals($expected, $result, '', 0.001);
    }

    public static function additionProvider(): array
    {
        return [
            [1, 2, 3],
            [0, 0, 0],
            [-1, 1, 0],
            [2.5, 2.5, 5.0],
            [-3.2, 1.8, -1.4],
        ];
    }
}