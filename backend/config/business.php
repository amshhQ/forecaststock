<?php

return [
    'default' => 'kelontong',

    'types' => [
        'kelontong' => [
            'label' => 'Toko kelontong / minimarket',
            'categories' => ['Sembako', 'Makanan & Minuman', 'Kebutuhan Rumah Tangga'],
            'units' => ['pcs', 'bungkus', 'botol', 'karung', 'liter', 'kg', 'dus'],
        ],
        'makanan' => [
            'label' => 'Usaha makanan & minuman',
            'categories' => ['Bahan Baku', 'Minuman', 'Kemasan'],
            'units' => ['porsi', 'gelas', 'kg', 'liter', 'pack', 'pcs'],
        ],
        'bangunan' => [
            'label' => 'Toko bangunan',
            'categories' => ['Semen & Pasir', 'Cat', 'Besi & Paku', 'Alat Pertukangan'],
            'units' => ['sak', 'kaleng', 'batang', 'kg', 'meter', 'pcs'],
        ],
        'obat' => [
            'label' => 'Apotek / toko obat',
            'categories' => ['Obat Bebas', 'Vitamin & Suplemen', 'Alat Kesehatan'],
            'units' => ['strip', 'botol', 'tube', 'box', 'pcs'],
        ],
        'pakaian' => [
            'label' => 'Toko pakaian',
            'categories' => ['Atasan', 'Bawahan', 'Aksesoris'],
            'units' => ['pcs', 'lusin', 'kodi', 'pasang'],
        ],
        'lainnya' => [
            'label' => 'Toko barang lainnya',
            'categories' => ['Umum'],
            'units' => ['pcs', 'unit', 'kg', 'liter'],
        ],
    ],
];
