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
        'GLP-1KG' => ['Sembako', 120, 10],
        'TLR-1KG' => ['Sembako', 25, 10],
        'AIR-600' => ['Makanan & Minuman', 150, 20],
        'ESK-CUP' => ['Makanan & Minuman', 30, 5],
        'SKM-370' => ['Makanan & Minuman', 15, 5],
        'TEH-BTL' => ['Makanan & Minuman', 5, 6],
    ];

    private const STOCK_HISTORY = [
        'TLR-1KG' => [
            ['awal', 20, '2026-10-12', null],
            ['masuk', 8, '2026-10-15', 'Kiriman pemasok'],
            ['rusak', -3, '2026-10-16', 'Telur pecah'],
        ],
    ];

    private const SCENARIOS = [
        ['Menjelang Lebaran', 25, 'Lebaran tahun ini lebih awal dari tahun sebelumnya.'],
        ['Hujan datang lebih awal', -10, 'Musim hujan datang lebih awal dari biasanya, jumlah pembeli cenderung turun.'],
        ['Promo toko', 15, 'Program potongan harga selama satu minggu.'],
    ];

    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => self::DEMO_EMAIL],
            ['name' => 'Akun Demo', 'store_name' => 'Minimarket Sejahtera', 'business_type' => 'kelontong', 'password' => self::DEMO_PASSWORD],
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
                    'sale_date' => $row['date'],
                    'quantity' => (int) $row['quantity'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            foreach (array_chunk($sales, 500) as $chunk) {
                DB::table('sales')->insert($chunk);
            }

            foreach ($products as $sku => $product) {
                foreach (self::STOCK_HISTORY[$sku] ?? [['awal', $product->current_stock, '2026-10-12', null]] as [$type, $quantity, $date, $note]) {
                    $product->movements()->create(['type' => $type, 'quantity' => $quantity, 'moved_on' => $date, 'note' => $note]);
                }
            }

            foreach (self::SCENARIOS as [$name, $percent, $description]) {
                $user->scenarios()->create(['name' => $name, 'adjustment_percent' => $percent, 'description' => $description]);
            }
        });
    }

    /**
     * Data demo dibaca dari CSV yang sama dengan script Python, supaya hasil prediksinya bisa dicocokkan.
     *
     * @return list<array<string, string>>
     */
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
