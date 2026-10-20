import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { api } from '../api/client'
import ProductFormModal from '../components/ProductForm'
import { Button, Empty, ErrorMessage, Loading, PageHeader, SearchInput, SortHeader, Table, td, th } from '../components/ui'
import { formatNumber } from '../lib/format'
import { useDebounce, useSort } from '../lib/hooks'
import { toast } from 'sonner'

const INFO = {
  from: ['Diisi sendiri lewat tombol Tambah produk.'],
  how: ['Perbarui stok saat ini lewat tombol Ubah setiap selesai menghitung barang di rak atau setelah barang dari pemasok datang. Stok tidak berkurang otomatis saat penjualan dicatat.'],
  note: ['Stok minimum adalah cadangan yang selalu ingin disisakan.', 'Menghapus produk ikut menghapus riwayat penjualannya.'],
}

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const keyword = useDebounce(search.trim())
  const [sort, toggleSort] = useSort('name')
  const [params, setParams] = useSearchParams()
  const openForm = (value) => setParams({ form: String(value) })
  const closeForm = () => setParams({}, { replace: true })

  const query = new URLSearchParams({ q: keyword, sort: sort.key, direction: sort.direction })
  const products = useQuery({
    queryKey: ['products', keyword, sort],
    queryFn: () => api(`/products?${query}`),
    placeholderData: keepPreviousData,
  })

  const remove = useMutation({
    mutationFn: (product) => api(`/products/${product.id}`, { method: 'DELETE' }),
    onError: (error) => toast.error(error.message),
    onSuccess: (_, product) => {
      toast.success(`Produk "${product.name}" dihapus.`)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['forecasts'] })
    },
  })

  const rows = products.data ?? []

  return (
    <>
      <PageHeader
        info={INFO}
        title="Produk & Stok"
        description="Daftar barang yang dijual, lengkap dengan stok saat ini dan stok minimum."
        actions={<Button onClick={() => openForm('baru')}>Tambah produk</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput id="cari-produk" label="Cari produk" placeholder="Cari nama atau SKU…" value={search} onChange={setSearch} />
        {products.isFetching && !products.isPending && <span className="text-xs text-stone-500">Memperbarui…</span>}
      </div>

      <ErrorMessage error={products.error} onRetry={() => products.refetch()} />

      {products.isPending ? (
        <Loading />
      ) : products.isError ? null : rows.length === 0 ? (
        keyword ? (
          <Empty title={`Tidak ada produk yang cocok dengan "${keyword}"`}>Coba kata kunci lain atau hapus pencarian.</Empty>
        ) : (
          <Empty title="Belum ada produk" action={<Button onClick={() => openForm('baru')}>Tambah produk pertama</Button>}>
            Produk perlu dibuat dulu sebelum mencatat penjualan dan melihat prediksi.
          </Empty>
        )
      ) : (
        <Table>
          <thead className="bg-stone-50">
            <tr>
              <SortHeader label="SKU" column="sku" sort={sort} onSort={toggleSort} />
              <SortHeader label="Nama" column="name" sort={sort} onSort={toggleSort} />
              <th className={th}>Kategori</th>
              <SortHeader label="Stok" column="current_stock" sort={sort} onSort={toggleSort} align="right" />
              <SortHeader label="Stok minimum" column="min_stock" sort={sort} onSort={toggleSort} align="right" />
              <th className={th}>
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-stone-50/70">
                <td className={`${td} font-mono text-xs text-stone-600`}>{p.sku}</td>
                <td className={`${td} font-medium`}>{p.name}</td>
                <td className={`${td} text-stone-600`}>{p.category?.name ?? <span className="text-stone-400">Tanpa kategori</span>}</td>
                <td className={`${td} text-right`}>
                  {formatNumber(p.current_stock)} <span className="text-stone-500">{p.unit}</span>
                </td>
                <td className={`${td} text-right`}>{formatNumber(p.min_stock)}</td>
                <td className={`${td} text-right`}>
                  <Link to={`/prediksi/${p.id}`} className="mr-3 text-teal-700 hover:underline">
                    Prediksi
                  </Link>
                  <button type="button" onClick={() => openForm(p.id)} className="mr-3 text-teal-700 hover:underline">
                    Ubah
                  </button>
                  <Button
                    variant="danger"
                    className="px-2.5 py-1 text-xs"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Hapus "${p.name}"? Riwayat penjualannya ikut terhapus.`)) remove.mutate(p)
                    }}
                  >
                    Hapus
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <ProductFormModal productId={params.get('form')} onClose={closeForm} />
    </>
  )
}
