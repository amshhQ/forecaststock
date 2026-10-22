import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../api/client'
import { formatDate, formatNumber, todayDate } from '../lib/format'
import { Button, ErrorMessage, Field, InfoLink, inputClass, Loading, Modal } from './ui'

const MAX_QUANTITY = 1000000

function validate(form) {
  const errors = {}
  if (!form.product_id) errors.product_id = 'Pilih produk.'
  if (!form.sale_date) errors.sale_date = 'Isi tanggal penjualan.'
  else if (form.sale_date > todayDate()) errors.sale_date = 'Tanggal ini belum terjadi.'
  const quantity = Number(form.quantity)
  if (form.quantity === '' || !Number.isInteger(quantity) || quantity < 0) errors.quantity = 'Isi bilangan bulat 0 atau lebih.'
  else if (quantity > MAX_QUANTITY) errors.quantity = 'Angkanya terlalu besar.'
  return errors
}

const INFO = {
  how: [
    'Catat kapan saja, misalnya tiap hari, tiap beberapa hari, atau sekaligus. Isi jumlah terjual pada tanggal itu.',
    'Kalau tanggal itu sudah tercatat, jumlahnya diganti dengan angka baru, tidak dobel.',
  ],
  note: [
    'Stok barang langsung berkurang sesuai jumlah terjual.',
    'Untuk prediksi, penjualan dijumlah per minggu (Senin sampai Minggu). Minggu yang sedang berjalan ikut dihitung setelah minggunya selesai.',
  ],
}

export default function SaleFormModal({ open, onClose }) {
  return (
    <Modal open={open} title="Catat penjualan" info={INFO} onClose={onClose}>
      <SaleForm onClose={onClose} />
    </Modal>
  )
}

function SaleForm({ onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ product_id: '', sale_date: todayDate(), quantity: '' })
  const [clientErrors, setClientErrors] = useState({})
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api('/products') })

  const save = useMutation({
    mutationFn: () => api('/sales', { method: 'POST', body: { ...form, quantity: Number(form.quantity) } }),
    onSuccess: (sale) => {
      toast.success(`Penjualan ${sale.product.name} tanggal ${formatDate(form.sale_date)} tersimpan. Stok sekarang ${formatNumber(sale.product.current_stock)} ${sale.product.unit}.`)
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['forecasts'] })
      queryClient.invalidateQueries({ queryKey: ['movements'] })
      onClose()
    },
  })

  const errors = { ...save.error?.fieldErrors, ...clientErrors }
  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
    setClientErrors({ ...clientErrors, [field]: undefined })
  }

  if (products.isPending) return <Loading />
  if (products.isError) return <ErrorMessage error={products.error} onRetry={() => products.refetch()} />
  if (products.data.length === 0) {
    return (
      <p className="text-sm text-stone-700">
        Belum ada produk. Penjualan dicatat per produk, jadi buat produknya dulu di <InfoLink to="/produk?form=baru">Produk & Stok</InfoLink>.
      </p>
    )
  }

  const selected = products.data.find((p) => String(p.id) === String(form.product_id))

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const found = validate(form)
        setClientErrors(found)
        if (Object.keys(found).length === 0) save.mutate()
      }}
    >
      <Field label="Produk" id="product_id" error={errors.product_id} hint={selected ? `Stok tercatat: ${formatNumber(selected.current_stock)} ${selected.unit}` : undefined}>
        <select id="product_id" className={inputClass} value={form.product_id} onChange={set('product_id')} aria-invalid={Boolean(errors.product_id)}>
          <option value="">Pilih produk…</option>
          {products.data.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal" id="sale_date" error={errors.sale_date}>
          <input id="sale_date" type="date" max={todayDate()} className={inputClass} value={form.sale_date} onChange={set('sale_date')} aria-invalid={Boolean(errors.sale_date)} />
        </Field>
        <Field label="Jumlah terjual" id="quantity" error={errors.quantity}>
          <input
            id="quantity"
            type="number"
            min={0}
            max={MAX_QUANTITY}
            step={1}
            inputMode="numeric"
            className={inputClass}
            value={form.quantity}
            onChange={set('quantity')}
            aria-invalid={Boolean(errors.quantity)}
          />
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
