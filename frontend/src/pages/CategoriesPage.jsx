import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../api/client'
import { Button, Empty, ErrorMessage, Field, inputClass, Loading, Modal, PageHeader, SortHeader, Table, td, th } from '../components/ui'
import { sortRows, useSort } from '../lib/hooks'

const INFO = {
  from: ['Dibuat otomatis saat daftar sesuai jenis toko, setelah itu bebas diubah.'],
  how: ['Kategori dipilih saat menambah produk, dan bisa dipakai untuk membatasi skenario ke sebagian barang.'],
  note: ['Menghapus kategori tidak menghapus produknya. Skenario khusus kategori itu ikut terhapus.'],
}

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [sort, toggleSort] = useSort('name')

  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api('/categories') })
  const remove = useMutation({
    mutationFn: (category) => api(`/categories/${category.id}`, { method: 'DELETE' }),
    onError: (error) => toast.error(error.message),
    onSuccess: (_, category) => {
      toast.success(`Kategori "${category.name}" dihapus.`)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['scenarios'] })
    },
  })

  const rows = sortRows(categories.data ?? [], sort, (row, key) => row[key])

  return (
    <>
      <PageHeader
        info={INFO}
        title="Kategori"
        description="Kelompok produk, misalnya Sembako atau Makanan & Minuman."
        actions={<Button onClick={() => setEditing({ id: null, name: '' })}>Tambah kategori</Button>}
      />

      <ErrorMessage error={categories.error} onRetry={() => categories.refetch()} />

      {categories.isPending ? (
        <Loading />
      ) : categories.isError ? null : rows.length === 0 ? (
        <Empty title="Belum ada kategori">Kategori bersifat opsional, tapi membantu merapikan daftar produk.</Empty>
      ) : (
        <div className="max-w-2xl">
          <Table>
            <thead className="bg-stone-50">
              <tr>
                <SortHeader label="Nama" column="name" sort={sort} onSort={toggleSort} />
                <SortHeader label="Jumlah produk" column="products_count" sort={sort} onSort={toggleSort} align="right" />
                <th className={th}>
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className={td}>{c.name}</td>
                  <td className={`${td} text-right`}>{c.products_count}</td>
                  <td className={`${td} text-right`}>
                    <Button variant="secondary" className="mr-2 px-2.5 py-1 text-xs" onClick={() => setEditing({ id: c.id, name: c.name })}>
                      Ubah
                    </Button>
                    <Button
                      variant="danger"
                      className="px-2.5 py-1 text-xs"
                      disabled={remove.isPending}
                      onClick={() => {
                        const note = c.products_count > 0 ? ` ${c.products_count} produk akan menjadi "Tanpa kategori".` : ''
                        if (window.confirm(`Hapus kategori "${c.name}"?${note} Skenario khusus kategori ini ikut terhapus.`)) remove.mutate(c)
                      }}
                    >
                      Hapus
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <Modal open={Boolean(editing)} title={editing?.id ? 'Ubah kategori' : 'Tambah kategori'} onClose={() => setEditing(null)}>
        {editing && <CategoryForm key={editing.id ?? 'baru'} category={editing} onClose={() => setEditing(null)} />}
      </Modal>
    </>
  )
}

function CategoryForm({ category, onClose }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(category.name)

  const save = useMutation({
    mutationFn: () =>
      api(category.id ? `/categories/${category.id}` : '/categories', { method: category.id ? 'PUT' : 'POST', body: { name: name.trim() } }),
    onSuccess: (saved) => {
      toast.success(category.id ? `Kategori diganti menjadi "${saved.name}".` : `Kategori "${saved.name}" ditambahkan.`)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      onClose()
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) save.mutate()
      }}
    >
      <Field label="Nama kategori" id="nama-kategori" error={save.error?.fieldErrors?.name}>
        <input
          id="nama-kategori"
          className={inputClass}
          value={name}
          maxLength={100}
          autoFocus
          aria-invalid={Boolean(save.error?.fieldErrors?.name)}
          onChange={(e) => {
            setName(e.target.value)
            save.reset()
          }}
        />
      </Field>
      {save.isError && !save.error.fieldErrors?.name && <ErrorMessage error={save.error} />}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" disabled={save.isPending || !name.trim()}>
          {save.isPending ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
