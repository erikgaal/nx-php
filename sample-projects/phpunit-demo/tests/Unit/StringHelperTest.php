<?php

declare(strict_types=1);

namespace Sample\PhpunitDemo\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Sample\PhpunitDemo\StringHelper;

class StringHelperTest extends TestCase
{
    private StringHelper $stringHelper;

    protected function setUp(): void
    {
        $this->stringHelper = new StringHelper();
    }

    public function testReverse(): void
    {
        $result = $this->stringHelper->reverse('hello');
        $this->assertEquals('olleh', $result);
    }

    public function testReverseEmptyString(): void
    {
        $result = $this->stringHelper->reverse('');
        $this->assertEquals('', $result);
    }

    /**
     * @dataProvider palindromeProvider
     */
    public function testIsPalindrome(string $input, bool $expected): void
    {
        $result = $this->stringHelper->isPalindrome($input);
        $this->assertEquals($expected, $result);
    }

    public static function palindromeProvider(): array
    {
        return [
            ['racecar', true],
            ['hello', false],
            ['A man a plan a canal Panama', true],
            ['race a car', false],
            ['', true],
            ['a', true],
            ['Madam', true],
        ];
    }

    public function testWordCount(): void
    {
        $this->assertEquals(3, $this->stringHelper->wordCount('hello world test'));
        $this->assertEquals(0, $this->stringHelper->wordCount(''));
        $this->assertEquals(1, $this->stringHelper->wordCount('word'));
    }

    public function testCapitalize(): void
    {
        $this->assertEquals('Hello World', $this->stringHelper->capitalize('hello world'));
        $this->assertEquals('Test String', $this->stringHelper->capitalize('TEST STRING'));
        $this->assertEquals('Mixed Case', $this->stringHelper->capitalize('MiXeD cAsE'));
    }
}