import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { api } from '../api/client'
import SaleFormModal from '../components/SaleForm'
import SalesImportModal from '../components/SalesImport'
import { Button, Empty, ErrorMessage, inputClass, LinkButton, Loading, PageHeader, SortHeader, Table, td, th } from '../components/ui'
import { formatDate, formatNumber } from '../lib/format'
import { useSort } from '../lib/hooks'
import { toast } from 'sonner'

const INFO = {
  from: ['Diisi lewat tombol Input penjualan untuk satu produk, atau Impor CSV untuk banyak data sekaligus.'],
  needs: ['Produknya sudah ada di Produk & Stok.'],
  note: ['Prediksi butuh minimal 2 minggu data, dan pola musim bulanan baru dihitung setelah 52 minggu. Minggu yang belum selesai belum bisa dicatat.'],
}

export default function SalesPage() {
  const queryClient = useQueryClient()
  const [productId, setProductId] = useState('')
  const [page, setPage] = useState(1)
  const [sort, toggleSort] = useSort('week_start', 'desc')
  const [params, setParams] = useSearchParams()
  const form = params.get('form')
  const openForm = (value) => setParams({ form: value })
  const closeForm = () => setParams({}, { replace: true })

  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api('/products') })
  const query = new URLSearchParams({ page, sort: sort.key, direction: sort.direction, ...(productId && { product_id: productId }) })
  const sales = useQuery({
    queryKey: ['sales', productId, page, sort],
    queryFn: () => api(`/sales?${query}`),
    placeholderData: keepPreviousData,
  })

  const remove = useMutation({
    mutationFn: (sale) => api(`/sales/${sale.id}`, { method: 'DELETE' }),
    onError: (error) => toast.error(error.message),
    onSuccess: () => {
      if (sales.data?.data.length === 1 && page > 1) setPage(page - 1)
      toast.success('Data penjualan dihapus.')
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['forecasts'] })
    },
  })

  const data = sales.data
  const lastPage = data?.last_page ?? 1

  const changeSort = (column) => {
    toggleSort(column)
    setPage(1)
  }

  return (
    <>
      <PageHeader
        info={INFO}
        title="Penjualan"
        description="Jumlah terjual per produk per minggu. Satu minggu dihitung mulai hari Senin."
        actions={
          <>
            <Button onClick={() => openForm('input')}>Input penjualan</Button>
            <Button variant="secondary" onClick={() => openForm('impor')}>
              Impor CSV
            </Button>
          </>
        }
      />

      <div className="mb-4 w-full sm:max-w-xs">
        <label htmlFor="filter-produk" className="block text-sm font-medium text-stone-700">
          Produk
        </label>
        <select
          id="filter-produk"
          className={`${inputClass} mt-1`}
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value)
            setPage(1)
          }}
        >
          <option value="">Semua produk</option>
          {products.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <ErrorMessage error={sales.error} onRetry={() => sales.refetch()} />

      {sales.isPending ? (
        <Loading />
      ) : sales.isError ? null : data.data.length === 0 ? (
        products.data?.length === 0 ? (
          <Empty title="Belum ada produk" action={<LinkButton to="/produk?form=baru">Tambah produk</LinkButton>}>
            Buat produk dulu, baru penjualannya bisa dicatat.
          </Empty>
        ) : (
          <Empty
            title={productId ? 'Produk ini belum punya data penjualan' : 'Belum ada data penjualan'}
            action={<Button onClick={() => openForm('input')}>Input penjualan</Button>}
          >
            Catat penjualan per minggu atau impor dari file CSV.
          </Empty>
        )
      ) : (
        <>
          <Table>
            <thead className="bg-stone-50">
              <tr>
                <SortHeader label="Minggu mulai" column="week_start" sort={sort} onSort={changeSort} />
                <th className={th}>Produk</th>
                <SortHeader label="Terjual" column="quantity" sort={sort} onSort={changeSort} align="right" />
                <th className={th}>
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-stone-100 ${sales.isFetching ? 'opacity-60' : ''}`}>
              {data.data.map((s) => (
                <tr key={s.id} className="hover:bg-stone-50/70">
                  <td className={td}>{formatDate(s.week_start)}</td>
                  <td className={td}>{s.product.name}</td>
                  <td className={`${td} text-right`}>
                    {formatNumber(s.quantity)} <span className="text-stone-500">{s.product.unit}</span>
                  </td>
                  <td className={`${td} text-right`}>
                    <Button
                      variant="danger"
                      className="px-2.5 py-1 text-xs"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (window.confirm(`Hapus penjualan ${s.product.name} minggu ${formatDate(s.week_start)}?`)) remove.mutate(s)
                      }}
                    >
                      Hapus
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <nav className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm" aria-label="Halaman data">
            <span className="text-stone-600">
              Halaman {data.current_page} dari {lastPage} · {formatNumber(data.total)} data
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1 || sales.isFetching} onClick={() => setPage(page - 1)}>
                Sebelumnya
              </Button>
              <Button variant="secondary" disabled={page >= lastPage || sales.isFetching} onClick={() => setPage(page + 1)}>
                Berikutnya
              </Button>
            </div>
          </nav>
        </>
      )}

      <SaleFormModal open={form === 'input'} onClose={closeForm} />
      <SalesImportModal open={form === 'impor'} onClose={closeForm} />
    </>
  )
}
