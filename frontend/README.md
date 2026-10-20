# Frontend ForecastStock

Aplikasi React (Vite) yang mengambil data dari REST API Laravel.

| Bagian | Lokasi |
|---|---|
| Daftar halaman (route) | `src/router.jsx` |
| Halaman (13) | `src/pages` |
| Komponen tampilan & tata letak, termasuk `Modal`, `InfoTip` (ikon ⓘ) | `src/components/ui.jsx`, `Layout.jsx` |
| Form dalam modal: produk, input penjualan, impor CSV | `src/components/ProductForm.jsx`, `SaleForm.jsx`, `SalesImport.jsx` |
| Pemanggil API | `src/api/client.js` |
| State login (Zustand) | `src/stores` |
| Notifikasi toast (sonner) | `src/main.jsx` (`<Toaster />`), dipanggil dengan `toast.success()` / `toast.error()` |
| Debounce, urutan tabel, format angka/tanggal | `src/lib` |

Perintah: `npm run dev` (development), `npm run build` (hasil untuk hosting), `npx oxlint src` (cek kode).
