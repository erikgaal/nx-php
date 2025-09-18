<?php

declare(strict_types=1);

namespace Sample\PhpunitDemo;

class StringHelper
{
    public function reverse(string $input): string
    {
        return strrev($input);
    }

    public function isPalindrome(string $input): bool
    {
        $cleaned = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $input));
        return $cleaned === strrev($cleaned);
    }

    public function wordCount(string $input): int
    {
        return str_word_count($input);
    }

    public function capitalize(string $input): string
    {
        return ucwords(strtolower($input));
    }
}