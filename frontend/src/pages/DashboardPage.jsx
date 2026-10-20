import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { api } from '../api/client'
import { Card, Empty, ErrorMessage, InfoLink, InfoTip, LinkButton, Loading, PageHeader, StatusBadge, Table, td, th } from '../components/ui'
import { formatDate, formatNumber } from '../lib/format'
import { useAuthStore } from '../stores/authStore'

const STATUS_TILES = [
  ['perlu_restock', 'Perlu restock', 'Stok di bawah target minggu depan'],
  ['berlebih', 'Stok berlebih', 'Cukup untuk lebih dari 2 minggu'],
  ['aman', 'Stok aman', 'Cukup untuk minggu depan'],
  ['data_kurang', 'Data kurang', 'Riwayat kurang dari 2 minggu'],
]

const INFO = {
  from: ['Semua angka dihitung otomatis dari data produk dan penjualan, tidak ada yang diketik manual.'],
  needs: ['Produk butuh penjualan minimal 2 minggu. Kalau belum, statusnya Data kurang.'],
  how: ['Klik nama produk untuk melihat grafik dan rincian hitungannya.'],
  note: ['Status di halaman ini dihitung tanpa skenario. Pengaruh skenario dilihat di Rekomendasi Stok.'],
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const dashboard = useQuery({ queryKey: ['forecasts', 'dashboard'], queryFn: () => api('/dashboard') })

  if (dashboard.isPending) return <Loading label="Menyiapkan ringkasan…" />
  if (dashboard.isError) return <ErrorMessage error={dashboard.error} onRetry={() => dashboard.refetch()} />

  const d = dashboard.data
  const nextWeek = d.top_forecasts[0]?.forecast.week_start

  if (d.total_products === 0) {
    return (
      <>
        <PageHeader title={`Halo, ${user?.name ?? ''}`} description="Belum ada data untuk diringkas." />
        <Empty title="Mulai dari menambah produk" action={<LinkButton to="/produk?form=baru">Tambah produk</LinkButton>}>
          Urutannya: tambah produk, catat atau impor penjualan mingguan, lalu buka halaman Prediksi dan Rekomendasi Stok.
        </Empty>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Halo, ${user?.name ?? ''}`}
        description={`${d.total_products} produk · penjualan terakhir tercatat minggu ${formatDate(d.last_week)}${nextWeek ? ` · prediksi untuk minggu ${formatDate(nextWeek)}` : ''}`}
        info={INFO}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATUS_TILES.map(([key, label, note]) => (
          <Card key={key} className="p-4">
            <p className="text-sm text-stone-600">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-stone-900">{d.status[key]}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <StatusBadge status={key} />
            </div>
            <p className="mt-1.5 text-xs text-stone-500">{note}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center gap-1">
            <h2 className="font-semibold text-stone-800">Prediksi tertinggi minggu depan</h2>
            <InfoTip label="Asal data prediksi tertinggi">
              5 produk dengan prediksi terbesar dari halaman <InfoLink to="/prediksi">Prediksi Trend Moment</InfoLink>. Prediksinya dihitung dari Penjualan Mingguan tiap produk.
            </InfoTip>
          </div>
          {d.top_forecasts.length === 0 ? (
            <Empty title="Belum ada prediksi">Catat penjualan minimal 2 minggu untuk tiap produk.</Empty>
          ) : (
            <Table>
              <thead className="bg-stone-50">
                <tr>
                  <th className={th}>Produk</th>
                  <th className={`${th} text-right`}>Prediksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {d.top_forecasts.map((r) => (
                  <tr key={r.product.id}>
                    <td className={td}>
                      <Link to={`/prediksi/${r.product.id}`} className="font-medium text-teal-800 hover:underline">
                        {r.product.name}
                      </Link>
                    </td>
                    <td className={`${td} text-right`}>
                      {formatNumber(r.forecast.value)} <span className="text-stone-500">{r.product.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center gap-1">
            <h2 className="font-semibold text-stone-800">Perlu restock</h2>
            <InfoTip label="Asal data perlu restock" align="right">
              Stok diambil dari <InfoLink to="/produk">Produk & Stok</InfoLink>. Jumlah tambah adalah target stok dikurangi stok saat ini. Setelah barang datang, perbarui stoknya supaya produk hilang dari daftar ini.
            </InfoTip>
          </div>
          {d.needs_restock.length === 0 ? (
            <Card>Semua stok masih cukup untuk minggu depan.</Card>
          ) : (
            <Table>
              <thead className="bg-stone-50">
                <tr>
                  <th className={th}>Produk</th>
                  <th className={`${th} text-right`}>Stok</th>
                  <th className={`${th} text-right`}>Tambah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {d.needs_restock.map((r) => (
                  <tr key={r.product.id}>
                    <td className={td}>{r.product.name}</td>
                    <td className={`${td} text-right`}>{formatNumber(r.product.current_stock)}</td>
                    <td className={`${td} text-right font-semibold`}>
                      {formatNumber(r.recommended_quantity)} <span className="font-normal text-stone-500">{r.product.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <Link to="/rekomendasi" className="mt-2 inline-block text-sm font-medium text-teal-800 hover:underline">
            Lihat semua rekomendasi
          </Link>
        </section>
      </div>
    </>
  )
}
