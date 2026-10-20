import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import { Empty, ErrorMessage, inputClass, LinkButton, Loading, PageHeader, SearchInput, SortHeader, StatusBadge, Table, td } from '../components/ui'
import { formatDate, formatNumber } from '../lib/format'
import { matches, sortRows, useDebounce, useSort } from '../lib/hooks'

const sortValue = (row, key) =>
  ({
    name: row.product.name,
    forecast: row.forecast?.value,
    adjusted: row.adjusted_forecast,
    min: row.product.min_stock,
    stock: row.product.current_stock,
    target: row.target_stock,
    recommended: row.recommended_quantity,
  })[key]

const INFO = {
  from: ['Prediksi dari halaman Prediksi, stok dari Produk & Stok, dan persen dari skenario yang dipilih.'],
  how: [
    'Target stok adalah prediksi setelah skenario, dibulatkan ke atas, ditambah stok minimum. Artinya jumlah yang perlu ada di rak saat minggu itu dimulai.',
    'Tambah stok adalah target stok dikurangi stok saat ini. Kalau stok sudah cukup, ditulis 0.',
  ],
  note: ['Berlebih berarti stok di atas stok minimum cukup untuk lebih dari 2 minggu.'],
}

export default function RecommendationsPage() {
  const [scenarioId, setScenarioId] = useState('')
  const [search, setSearch] = useState('')
  const keyword = useDebounce(search)
  const [sort, toggleSort] = useSort('recommended', 'desc')

  const scenarios = useQuery({ queryKey: ['scenarios'], queryFn: () => api('/scenarios') })
  const recommendations = useQuery({
    queryKey: ['forecasts', 'recommendations', scenarioId],
    queryFn: () => api(`/recommendations${scenarioId ? `?scenario_id=${scenarioId}` : ''}`),
    placeholderData: keepPreviousData,
  })

  const items = recommendations.data?.items ?? []
  const week = items.find((r) => r.forecast)?.forecast.week_start
  const scenario = recommendations.data?.scenario
  const rows = sortRows(
    items.filter((r) => matches(r.product.name, keyword) || matches(r.product.sku, keyword)),
    sort,
    sortValue,
  )
  const totalRestock = items.filter((r) => r.status === 'perlu_restock').length

  return (
    <>
      <PageHeader info={INFO} title="Rekomendasi Stok" description={`Jumlah barang yang sebaiknya ditambah untuk minggu ${week ? formatDate(week) : 'depan'}.`} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-72">
          <label htmlFor="skenario" className="block text-sm font-medium text-stone-700">
            Skenario penyesuaian
          </label>
          <select id="skenario" className={`${inputClass} mt-1`} value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
            <option value="">Tanpa skenario (normal)</option>
            {scenarios.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({Number(s.adjustment_percent) > 0 ? '+' : ''}
                {Number(s.adjustment_percent)}%{s.category ? `, ${s.category.name}` : ''})
              </option>
            ))}
          </select>
        </div>
        <SearchInput id="cari-rekomendasi" label="Cari produk" placeholder="Cari nama atau SKU…" value={search} onChange={setSearch} />
      </div>

      {scenario && (
        <p className="mb-3 text-sm text-stone-600">
          Skenario aktif: <strong>{scenario.name}</strong> ({Number(scenario.adjustment_percent) > 0 ? '+' : ''}
          {Number(scenario.adjustment_percent)}%) untuk {scenario.category_id ? 'produk di kategori yang dipilih' : 'semua produk'} · {totalRestock} produk perlu restock
        </p>
      )}

      <ErrorMessage error={recommendations.error} onRetry={() => recommendations.refetch()} />

      {recommendations.isPending ? (
        <Loading label="Menghitung rekomendasi…" />
      ) : recommendations.isError ? null : items.length === 0 ? (
        <Empty title="Belum ada produk" action={<LinkButton to="/produk?form=baru">Tambah produk</LinkButton>} />
      ) : rows.length === 0 ? (
        <Empty title={`Tidak ada produk yang cocok dengan "${keyword}"`} />
      ) : (
        <Table>
          <thead className="bg-stone-50">
            <tr>
              <SortHeader label="Produk" column="name" sort={sort} onSort={toggleSort} />
              <SortHeader label="Prediksi" column="forecast" sort={sort} onSort={toggleSort} align="right" />
              <SortHeader label="Setelah skenario" column="adjusted" sort={sort} onSort={toggleSort} align="right" />
              <SortHeader label="Stok minimum" column="min" sort={sort} onSort={toggleSort} align="right" />
              <SortHeader label="Target stok" column="target" sort={sort} onSort={toggleSort} align="right" />
              <SortHeader label="Stok saat ini" column="stock" sort={sort} onSort={toggleSort} align="right" />
              <SortHeader label="Tambah stok" column="recommended" sort={sort} onSort={toggleSort} align="right" />
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-stone-100 ${recommendations.isFetching ? 'opacity-60' : ''}`}>
            {rows.map((r) => (
              <tr key={r.product.id} className="hover:bg-stone-50/70">
                <td className={`${td} font-medium`}>{r.product.name}</td>
                <td className={`${td} text-right`}>{formatNumber(r.forecast?.value)}</td>
                <td className={`${td} text-right`}>
                  {formatNumber(r.adjusted_forecast)}
                  {r.adjusted_forecast !== null && r.adjustment_percent !== 0 && <span className="ml-1 text-xs text-stone-500">({r.adjustment_percent > 0 ? '+' : ''}{r.adjustment_percent}%)</span>}
                </td>
                <td className={`${td} text-right`}>{formatNumber(r.product.min_stock)}</td>
                <td className={`${td} text-right`}>{formatNumber(r.target_stock)}</td>
                <td className={`${td} text-right`}>{formatNumber(r.product.current_stock)}</td>
                <td className={`${td} text-right font-semibold`}>
                  {r.recommended_quantity === null ? (
                    '–'
                  ) : (
                    <>
                      {formatNumber(r.recommended_quantity)} <span className="font-normal text-stone-500">{r.product.unit}</span>
                    </>
                  )}
                </td>
                <td className={td}>
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
