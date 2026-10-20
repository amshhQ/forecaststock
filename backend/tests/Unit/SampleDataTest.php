<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class SampleDataTest extends TestCase
{
    public function test_data_simulasi_backend_sama_dengan_script_python(): void
    {
        $root = dirname(__DIR__, 3);
        $normalize = fn (string $path) => str_replace("\r\n", "\n", file_get_contents($path));

        $this->assertSame(
            $normalize("$root/scripts/forecast/sample_sales.csv"),
            $normalize("$root/backend/database/data/sample_sales.csv"),
        );
    }
}
