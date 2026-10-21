import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { api } from '../api/client'
import { Empty, ErrorMessage, LinkButton, Loading, PageHeader, SearchInput, SortHeader, StatusBadge, Table, td, th } from '../components/ui'
import { formatDate, formatNumber, mapeLabel } from '../lib/format'
import { matches, sortRows, useDebounce, useSort } from '../lib/hooks'

const STATUS_ORDER = { perlu_restock: 0, berlebih: 1, aman: 2, data_kurang: 3 }

const sortValue = (row, key) =>
  ({
    name: row.product.name,
    weeks: row.weeks_of_data,
    trend: row.forecast?.trend,
    seasonal: row.forecast?.seasonal_index,
    forecast: row.forecast?.value,
    mape: row.accuracy?.mape,
    status: STATUS_ORDER[row.status],
  })[key]

const INFO = {
  from: ['Dihitung otomatis dari riwayat penjualan tiap produk dengan metode Trend Moment.'],
  how: [
    'Tren adalah arah naik atau turunnya penjualan dari minggu ke minggu.',
    'Indeks musim di atas 1 berarti bulan itu biasanya ramai, di bawah 1 berarti sepi.',
    'Prediksi adalah tren dikali indeks musim.',
    'MAPE adalah rata-rata meleset prediksi pada 8 minggu terakhir. Makin kecil makin akurat.',
  ],
  note: ['Kalau minggu depan ada kondisi yang tidak biasa, sesuaikan lewat skenario di Rekomendasi Stok.'],
}

export default function ForecastsPage() {
  const [search, setSearch] = useState('')
  const keyword = useDebounce(search)
  const [sort, toggleSort] = useSort('forecast', 'desc')
  const forecasts = useQuery({ queryKey: ['forecasts'], queryFn: () => api('/forecasts') })

  const all = forecasts.data ?? []
  const nextWeek = all.find((r) => r.forecast)?.forecast.week_start
  const rows = sortRows(
    all.filter((r) => matches(r.product.name, keyword) || matches(r.product.sku, keyword)),
    sort,
    sortValue,
  )

  return (
    <>
      <PageHeader
        info={INFO}
        title="Prediksi Penjualan"
        description={`Perkiraan jumlah terjual minggu depan${nextWeek ? ` (mulai ${formatDate(nextWeek)})` : ''} untuk setiap produk, dihitung dengan metode Trend Moment.`}
      />

      <div className="mb-4">
        <SearchInput id="cari-prediksi" label="Cari produk" placeholder="Cari nama atau SKU…" value={search} onChange={setSearch} />
      </div>

      <ErrorMessage error={forecasts.error} onRetry={() => forecasts.refetch()} />

      {forecasts.isPending ? (
        <Loading label="Menghitung prediksi…" />
      ) : forecasts.isError ? null : all.length === 0 ? (
        <Empty title="Belum ada produk" action={<LinkButton to="/produk?form=baru">Tambah produk</LinkButton>}>
          Prediksi dihitung per produk dari riwayat penjualannya.
        </Empty>
      ) : rows.length === 0 ? (
        <Empty title={`Tidak ada produk yang cocok dengan "${keyword}"`} />
      ) : (
        <Table>
          <thead className="bg-stone-50">
            <tr>
              <SortHeader label="Produk" column="name" sort={sort} onSort={toggleSort} />
              <SortHeader label="Data" column="weeks" sort={sort} onSort={toggleSort} align="right" />
              <SortHeader label="Tren" column="trend" sort={sort} onSort={toggleSort} align="right" />
              <SortHeader label="Indeks musim" column="seasonal" sort={sort} onSort={toggleSort} align="right" />
              <SortHeader label="Prediksi" column="forecast" sort={sort} onSort={toggleSort} align="right" />
              <SortHeader label="Error (MAPE)" column="mape" sort={sort} onSort={toggleSort} align="right" />
              <SortHeader label="Status stok" column="status" sort={sort} onSort={toggleSort} />
              <th className={th}>
                <span className="sr-only">Detail</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((r) => (
              <tr key={r.product.id} className="hover:bg-stone-50/70">
                <td className={td}>
                  <span className="font-medium">{r.product.name}</span> <span className="text-xs text-stone-500">{r.product.sku}</span>
                </td>
                <td className={`${td} text-right`}>{r.weeks_of_data} minggu</td>
                <td className={`${td} text-right`}>{formatNumber(r.forecast?.trend)}</td>
                <td className={`${td} text-right`}>{r.forecast ? r.forecast.seasonal_index.toFixed(4) : '-'}</td>
                <td className={`${td} text-right font-semibold`}>
                  {r.forecast ? (
                    <>
                      {formatNumber(r.forecast.value)} <span className="font-normal text-stone-500">{r.product.unit}</span>
                    </>
                  ) : (
                    '-'
                  )}
                </td>
                <td className={`${td} text-right`}>
                  {r.accuracy?.mape === null || r.accuracy?.mape === undefined ? (
                    '-'
                  ) : (
                    <>
                      {formatNumber(r.accuracy.mape)}% <span className="text-xs text-stone-500">{mapeLabel(r.accuracy.mape)}</span>
                    </>
                  )}
                </td>
                <td className={td}>
                  <StatusBadge status={r.status} />
                </td>
                <td className={`${td} text-right`}>
                  <Link to={`/prediksi/${r.product.id}`} className="text-teal-700 hover:underline">
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
