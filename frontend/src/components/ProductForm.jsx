import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { Button, ErrorMessage, Field, inputClass, Loading, Modal } from './ui'

const EMPTY = { sku: '', name: '', unit: '', category_id: '', current_stock: 0, min_stock: 0 }
const MAX_STOCK = 1000000

function validate(form) {
  const errors = {}
  if (!form.sku.trim()) errors.sku = 'SKU wajib diisi.'
  if (!form.name.trim()) errors.name = 'Nama wajib diisi.'
  if (!form.unit.trim()) errors.unit = 'Satuan wajib diisi.'
  for (const field of ['current_stock', 'min_stock']) {
    const value = Number(form[field])
    if (form[field] === '' || !Number.isInteger(value) || value < 0) errors[field] = 'Isi bilangan bulat 0 atau lebih.'
    else if (value > MAX_STOCK) errors[field] = 'Angkanya terlalu besar.'
  }
  return errors
}

const INFO = {
  how: [
    'SKU adalah kode unik barang, dipakai juga di file impor.',
    'Stok saat ini diisi dari hasil hitung barang di rak atau gudang.',
    'Stok minimum adalah cadangan supaya barang tidak habis sebelum belanja berikutnya.',
  ],
}

export default function ProductFormModal({ productId, onClose }) {
  const isEdit = Boolean(productId) && productId !== 'baru'
  const product = useQuery({ queryKey: ['product', productId], queryFn: () => api(`/products/${productId}`), enabled: isEdit, retry: false })

  let body
  if (isEdit && product.isPending) body = <Loading />
  else if (isEdit && product.isError) body = <ErrorMessage error={product.error} />
  else {
    const initial = isEdit ? { ...EMPTY, ...product.data, category_id: product.data.category_id ?? '' } : EMPTY
    body = <ProductForm key={productId} id={isEdit ? productId : null} initial={initial} onClose={onClose} />
  }

  return (
    <Modal open={Boolean(productId)} title={isEdit ? 'Ubah produk & stok' : 'Tambah produk'} info={INFO} onClose={onClose}>
      {body}
    </Modal>
  )
}

function ProductForm({ id, initial, onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(initial)
  const [clientErrors, setClientErrors] = useState({})
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api('/categories') })
  const units = useAuthStore((s) => s.user?.units ?? [])

  const save = useMutation({
    mutationFn: (body) => api(id ? `/products/${id}` : '/products', { method: id ? 'PUT' : 'POST', body }),
    onSuccess: (saved) => {
      toast.success(id ? `Perubahan "${saved.name}" disimpan.` : `Produk "${saved.name}" ditambahkan.`)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', String(id)] })
      queryClient.invalidateQueries({ queryKey: ['forecasts'] })
      onClose()
    },
  })

  const errors = { ...save.error?.fieldErrors, ...clientErrors }
  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
    setClientErrors({ ...clientErrors, [field]: undefined })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const found = validate(form)
    setClientErrors(found)
    if (Object.keys(found).length > 0) return
    save.mutate({
      sku: form.sku.trim(),
      name: form.name.trim(),
      unit: form.unit.trim(),
      category_id: form.category_id || null,
      current_stock: Number(form.current_stock),
      min_stock: Number(form.min_stock),
    })
  }

  const input = (field, props = {}) => (
    <input
      id={field}
      className={inputClass}
      value={form[field]}
      onChange={set(field)}
      aria-invalid={Boolean(errors[field])}
      aria-describedby={errors[field] ? `${field}-error` : undefined}
      {...props}
    />
  )

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="SKU (kode barang)" id="sku" error={errors.sku} hint="Contoh: BRS-5KG">
          {input('sku', { maxLength: 50 })}
        </Field>
        <Field label="Satuan" id="unit" error={errors.unit} hint={units.length ? `Saran: ${units.join(', ')}` : 'Contoh: pcs, botol, karung'}>
          {input('unit', { maxLength: 20, list: 'saran-satuan' })}
        </Field>
        <datalist id="saran-satuan">
          {units.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </div>
      <Field label="Nama barang" id="name" error={errors.name}>
        {input('name', { maxLength: 150 })}
      </Field>
      <Field
        label="Kategori"
        id="category_id"
        error={errors.category_id}
        hint={categories.data?.length === 0 ? 'Belum ada kategori. Buat dulu di halaman Kategori, atau simpan tanpa kategori.' : undefined}
      >
        <select id="category_id" className={inputClass} value={form.category_id} onChange={set('category_id')} disabled={categories.isPending}>
          <option value="">{categories.isPending ? 'Memuat kategori…' : 'Tanpa kategori'}</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Stok saat ini" id="current_stock" error={errors.current_stock} hint="Hasil hitung di rak/gudang">
          {input('current_stock', { type: 'number', min: 0, max: MAX_STOCK, step: 1, inputMode: 'numeric' })}
        </Field>
        <Field label="Stok minimum" id="min_stock" error={errors.min_stock} hint="Stok pengaman yang selalu ingin disimpan">
          {input('min_stock', { type: 'number', min: 0, max: MAX_STOCK, step: 1, inputMode: 'numeric' })}
        </Field>
      </div>

      {save.isError && !Object.keys(save.error.fieldErrors).length && <ErrorMessage error={save.error} />}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
