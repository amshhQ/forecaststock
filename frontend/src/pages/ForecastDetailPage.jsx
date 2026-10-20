import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router'
import { CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api/client'
import { Button, Card, Empty, InfoLink, InfoTip, LinkButton, Loading, PageHeader, StatusBadge, Table, td, th } from '../components/ui'
import { formatDate, formatNumber, mapeLabel } from '../lib/format'

const COLORS = { actual: '#2a78d6', trend: '#eb6834', forecast: '#1baf7a' }
const RANGES = [
  { weeks: 26, label: '26 minggu' },
  { weeks: 52, label: '52 minggu' },
  { weeks: 0, label: 'Semua' },
]

const INFO = {
  from: ['Dihitung dari riwayat penjualan produk ini.'],
  how: ['Arahkan kursor ke grafik untuk melihat angka tiap minggu. Tombol 26, 52, dan Semua mengatur rentangnya.'],
  note: ['Angka di halaman ini sama dengan hasil script Python di folder scripts/forecast, dan kesamaannya dicek otomatis oleh test.'],
}

export default function ForecastDetailPage() {
  const { id } = useParams()
  const [range, setRange] = useState(26)
  const [showTable, setShowTable] = useState(false)
  const detail = useQuery({ queryKey: ['forecasts', id], queryFn: () => api(`/forecasts/${id}`), retry: false })

  if (detail.isPending) return <Loading label="Menghitung prediksi…" />
  if (detail.isError) {
    return (
      <Empty title="Prediksi tidak bisa ditampilkan" action={<LinkButton to="/prediksi">Kembali ke daftar prediksi</LinkButton>}>
        {detail.error.message}
      </Empty>
    )
  }

  const { product, forecast, history, accuracy, weeks_of_data: weeks, status, target_stock: target } = detail.data
  const shortage = target - product.current_stock
  const visible = range ? history.slice(-range) : history
  const chartData = visible.map((h) => ({ week: h.week_start, actual: h.quantity, trend: h.trend }))
  if (forecast) chartData.push({ week: forecast.week_start, trend: forecast.trend, forecast: forecast.value })

  const back = (
    <LinkButton to="/prediksi" variant="secondary">
      Kembali
    </LinkButton>
  )

  if (!forecast) {
    return (
      <>
        <PageHeader info={INFO} title={product.name} description={`SKU ${product.sku} · ${weeks} minggu data penjualan`} actions={back} />
        <Empty title="Data penjualan belum cukup" action={<LinkButton to="/penjualan?form=input">Input penjualan</LinkButton>}>
          Trend Moment butuh minimal 2 minggu data. Produk ini baru punya {weeks} minggu.
        </Empty>
      </>
    )
  }

  return (
    <>
      <PageHeader info={INFO} title={product.name} description={`SKU ${product.sku} · ${weeks} minggu data penjualan`} actions={back} />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-stone-600">Prediksi minggu {formatDate(forecast.week_start)}</p>
          <p className="mt-1 text-3xl font-semibold text-stone-900">
            {formatNumber(forecast.value)} <span className="text-base font-normal text-stone-500">{product.unit}</span>
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-1">
            <p className="text-sm text-stone-600">Stok saat ini / minimum</p>
            <InfoTip label="Asal angka stok">
              Diketik pemilik toko di <InfoLink to={`/produk?form=${product.id}`}>Ubah produk</InfoLink>. Tidak berkurang otomatis saat penjualan dicatat.
            </InfoTip>
          </div>
          <p className="mt-1 text-3xl font-semibold text-stone-900">
            {formatNumber(product.current_stock)} <span className="text-base font-normal text-stone-500">/ {formatNumber(product.min_stock)}</span>
          </p>
        </Card>
        <Card>
          <p className="text-sm text-stone-600">Status stok</p>
          <p className="mt-2">
            <StatusBadge status={status} />
          </p>
        </Card>
      </div>

      <Card className="mb-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <h2 className="font-semibold text-stone-800">Penjualan mingguan, garis tren, dan prediksi</h2>
            <InfoTip label="Cara membaca grafik">
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  <strong>Garis biru</strong>: penjualan asli per minggu, dari Penjualan Mingguan.
                </li>
                <li>
                  <strong>Garis oranye putus-putus</strong>: garis tren Y = a + bX hasil Trend Moment.
                </li>
                <li>
                  <strong>Titik hijau</strong> di ujung kanan: prediksi minggu depan, yaitu tren dikali indeks musim.
                </li>
              </ul>
            </InfoTip>
          </div>
          <div className="flex gap-1" role="group" aria-label="Rentang waktu">
            {RANGES.filter((r) => r.weeks === 0 || r.weeks < weeks).map((r) => (
              <Button key={r.weeks} variant={range === r.weeks ? 'primary' : 'secondary'} className="px-2.5 py-1 text-xs" aria-pressed={range === r.weeks} onClick={() => setRange(r.weeks)}>
                {r.label}
              </Button>
            ))}
          </div>
        </div>
        <div
          className="h-80"
          role="img"
          aria-label={`Grafik penjualan mingguan ${product.name} dengan garis tren dan prediksi ${formatNumber(forecast.value)} ${product.unit} untuk minggu ${formatDate(forecast.week_start)}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 24, right: 28, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="#e7e5e4" vertical={false} />
              <XAxis dataKey="week" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#57534e' }} minTickGap={32} />
              <YAxis domain={[0, 'auto']} tick={{ fontSize: 11, fill: '#57534e' }} width={44} />
              <Tooltip labelFormatter={(week) => `Minggu ${formatDate(week)}`} formatter={(value, name) => [`${formatNumber(value)} ${product.unit}`, name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line isAnimationActive={false} name="Penjualan aktual" dataKey="actual" stroke={COLORS.actual} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              <Line isAnimationActive={false} name="Garis tren (a + bX)" dataKey="trend" stroke={COLORS.trend} strokeWidth={2} strokeDasharray="6 4" dot={false} />
              <Line isAnimationActive={false} name="Prediksi" dataKey="forecast" stroke={COLORS.forecast} strokeWidth={2} dot={{ r: 6, fill: COLORS.forecast, stroke: '#ffffff', strokeWidth: 2 }}>
                <LabelList dataKey="forecast" position="top" formatter={(v) => (v === undefined ? '' : formatNumber(v))} style={{ fontSize: 12, fill: '#1c1917', fontWeight: 600 }} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <Button variant="secondary" className="mt-3 px-2.5 py-1 text-xs" aria-expanded={showTable} onClick={() => setShowTable(!showTable)}>
          {showTable ? 'Sembunyikan tabel' : 'Tampilkan sebagai tabel'}
        </Button>
        {showTable && (
          <div className="mt-3 max-h-80 overflow-y-auto">
            <Table>
              <thead className="bg-stone-50">
                <tr>
                  <th className={th}>Minggu</th>
                  <th className={`${th} text-right`}>Aktual</th>
                  <th className={`${th} text-right`}>Tren</th>
                  <th className={`${th} text-right`}>Prediksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {[...chartData].reverse().map((row) => (
                  <tr key={row.week}>
                    <td className={td}>{formatDate(row.week)}</td>
                    <td className={`${td} text-right`}>{formatNumber(row.actual)}</td>
                    <td className={`${td} text-right`}>{formatNumber(row.trend)}</td>
                    <td className={`${td} text-right`}>{formatNumber(row.forecast)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-1">
          <h2 className="font-semibold text-stone-800">Rincian perhitungan Trend Moment</h2>
          <InfoTip label="Asal rumus dan kenapa ada angka koma">
            <p>a dan b dicari dari dua persamaan: ΣY = n·a + b·ΣX dan ΣXY = a·ΣX + b·ΣX², dengan X = 0, 1, 2, … untuk tiap minggu. Indeks musim = rata-rata penjualan mingguan bulan itu ÷ rata-rata seluruh data.</p>
            <p className="mt-2">
              Angka berkoma itu wajar: a, b, tren, dan prediksi adalah perkiraan rata-rata, bukan jumlah barang. Baru di baris Target stok angkanya dibulatkan ke atas, karena barang tidak bisa dibeli setengah dan membulatkan ke atas lebih aman daripada kurang.
            </p>
          </InfoTip>
        </div>
        <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm lg:grid-cols-2">
          <Row label="1. Jumlah data (n)" value={`${weeks} minggu, X = 0 sampai ${weeks - 1}`} />
          <Row label="2. Persamaan tren" value={`Y = ${forecast.a} + (${forecast.b}) X`} />
          <Row label="3. X untuk minggu depan" value={weeks} />
          <Row label="4. Nilai tren" value={`${forecast.a} + (${forecast.b} × ${weeks}) = ${formatNumber(forecast.trend)}`} />
          <Row label="5. Indeks musim bulan tersebut" value={weeks >= 52 ? forecast.seasonal_index : '1 (data < 52 minggu)'} />
          <Row label="6. Prediksi" value={`${formatNumber(forecast.trend)} × ${forecast.seasonal_index} = ${formatNumber(forecast.value)}`} />
          <Row label="7. Target stok (dibulatkan ke atas)" value={`⌈${formatNumber(forecast.value)}⌉ + ${product.min_stock} = ${target}`} />
          <Row label="8. Perlu ditambah" value={`${target} − ${product.current_stock} = ${shortage}${shortage < 0 ? ', jadi 0 (stok cukup)' : ''}`} />
        </dl>
        <p className="mt-2 text-xs text-stone-500">Langkah 7–8 tanpa skenario. Pengaruh skenario dilihat di Rekomendasi Stok.</p>
      </Card>

      {accuracy && (
        <Card className="mt-5">
          <div className="flex items-center gap-1">
            <h2 className="font-semibold text-stone-800">Seberapa akurat? Uji mundur {accuracy.weeks} minggu terakhir</h2>
            <InfoTip label="Cara uji mundur">
              <p>Tiap minggu di tabel diprediksi hanya dari data sebelum minggu itu, seolah-olah minggu itu belum terjadi. Lalu hasilnya dibandingkan dengan penjualan aslinya.</p>
              <p className="mt-2">Selisih dihitung dalam persen dari penjualan asli, lalu dirata-rata menjadi MAPE. Di bawah 10% sangat baik, 10 sampai 20% baik, 20 sampai 50% cukup, di atas 50% kurang akurat.</p>
            </InfoTip>
          </div>
          <p className="mt-1 text-sm text-stone-700">
            MAPE{' '}
            <strong>
              {accuracy.mape === null ? '–' : `${formatNumber(accuracy.mape)}% (${mapeLabel(accuracy.mape)})`}
            </strong>
            {accuracy.mape !== null && <>: rata-rata prediksi meleset sekitar {formatNumber(accuracy.mape)}% dari penjualan asli.</>}
          </p>
          <div className="mt-3">
            <Table>
              <thead className="bg-stone-50">
                <tr>
                  <th className={th}>Minggu</th>
                  <th className={`${th} text-right`}>Asli</th>
                  <th className={`${th} text-right`}>Prediksi</th>
                  <th className={`${th} text-right`}>Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {accuracy.rows.map((row) => (
                  <tr key={row.week_start}>
                    <td className={td}>{formatDate(row.week_start)}</td>
                    <td className={`${td} text-right`}>{formatNumber(row.actual)}</td>
                    <td className={`${td} text-right`}>{formatNumber(row.forecast)}</td>
                    <td className={`${td} text-right`}>{row.error_percent === null ? '– (terjual 0)' : `${formatNumber(row.error_percent)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}
    </>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex flex-col justify-between gap-0.5 border-b border-stone-100 py-1.5 sm:flex-row sm:gap-4">
      <dt className="text-stone-600">{label}</dt>
      <dd className="font-mono text-stone-900 sm:text-right">{value}</dd>
    </div>
  )
}
