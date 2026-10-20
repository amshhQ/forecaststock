<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public const DEMO_EMAIL = 'demo@forecaststock.test';

    public const DEMO_PASSWORD = 'demo12345';

    private const PRODUCT_SETUP = [
        'BRS-5KG' => ['Sembako', 20, 10],
        'MYK-1L' => ['Sembako', 80, 15],
        'GLP-1KG' => ['Sembako', 120, 10],
        'TLR-1KG' => ['Sembako', 25, 8],
        'MIE-INS' => ['Makanan & Minuman', 60, 30],
        'AIR-600' => ['Makanan & Minuman', 240, 40],
        'KPI-SCT' => ['Makanan & Minuman', 400, 25],
        'ESK-CUP' => ['Makanan & Minuman', 30, 5],
        'SKM-370' => ['Makanan & Minuman', 10, 5],
        'TEH-BTL' => ['Makanan & Minuman', 24, 6],
        'SBN-CP' => ['Kebutuhan Rumah Tangga', 45, 10],
    ];

    private const SCENARIOS = [
        ['Menjelang Lebaran', 25, 'Contoh: Lebaran tahun ini jatuh lebih awal, jadi belum terbaca oleh indeks musim bulan.'],
        ['Hujan datang lebih awal', -10, 'Contoh: hujan deras sebelum bulan musim hujan biasanya, pembeli yang datang berkurang.'],
        ['Promo toko', 15, 'Contoh: ada potongan harga di toko.'],
    ];

    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => self::DEMO_EMAIL],
            ['name' => 'Akun Demo', 'store_name' => 'Warung Demo Sejahtera', 'business_type' => 'kelontong', 'password' => self::DEMO_PASSWORD],
        );

        $this->seedDemoData($user);
    }

    public function seedDemoData(User $user): void
    {
        DB::transaction(function () use ($user) {
            $user->products()->delete();
            $user->categories()->delete();
            $user->scenarios()->delete();

            $categories = [];
            foreach (array_unique(array_column(self::PRODUCT_SETUP, 0)) as $name) {
                $categories[$name] = $user->categories()->create(['name' => $name]);
            }

            $products = [];
            $sales = [];
            foreach ($this->readSales() as $row) {
                $sku = $row['sku'];
                if (! isset($products[$sku])) {
                    [$category, $stock, $minStock] = self::PRODUCT_SETUP[$sku];
                    $products[$sku] = $user->products()->create([
                        'category_id' => $categories[$category]->id,
                        'sku' => $sku,
                        'name' => $row['name'],
                        'unit' => $row['unit'],
                        'current_stock' => $stock,
                        'min_stock' => $minStock,
                    ]);
                }
                $sales[] = [
                    'product_id' => $products[$sku]->id,
                    'week_start' => $row['week_start'],
                    'quantity' => (int) $row['quantity'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            DB::table('sales')->insert($sales);

            foreach (self::SCENARIOS as [$name, $percent, $description]) {
                $user->scenarios()->create(['name' => $name, 'adjustment_percent' => $percent, 'description' => $description]);
            }
        });
    }

    /** @return list<array<string, string>> */
    private function readSales(): array
    {
        $file = fopen(database_path('data/sample_sales.csv'), 'r');
        $header = fgetcsv($file, escape: '');
        $rows = [];
        while (($line = fgetcsv($file, escape: '')) !== false) {
            $rows[] = array_combine($header, $line);
        }
        fclose($file);

        return $rows;
    }
}
