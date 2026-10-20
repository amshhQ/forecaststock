import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../api/client'
import { formatDate, lastFinishedMonday } from '../lib/format'
import { Button, ErrorMessage, Field, InfoLink, inputClass, Loading, Modal } from './ui'

const MAX_QUANTITY = 1000000

function validate(form) {
  const errors = {}
  if (!form.product_id) errors.product_id = 'Pilih produk.'
  if (!form.week_start) {
    errors.week_start = 'Isi tanggal awal minggu.'
  } else {
    const [y, m, d] = form.week_start.split('-').map(Number)
    if (new Date(y, m - 1, d).getDay() !== 1) errors.week_start = 'Tanggal awal minggu harus hari Senin.'
    else if (form.week_start > lastFinishedMonday()) errors.week_start = 'Minggu ini belum selesai. Penjualannya dicatat mulai Senin depan.'
  }
  const quantity = Number(form.quantity)
  if (form.quantity === '' || !Number.isInteger(quantity) || quantity < 0) errors.quantity = 'Isi bilangan bulat 0 atau lebih.'
  else if (quantity > MAX_QUANTITY) errors.quantity = 'Angkanya terlalu besar.'
  return errors
}

const INFO = {
  how: [
    'Isi total terjual selama satu minggu, Senin sampai Minggu.',
    'Hanya minggu yang sudah selesai yang bisa dicatat. Kalau minggu itu sudah ada, jumlahnya diperbarui.',
  ],
}

export default function SaleFormModal({ open, onClose }) {
  return (
    <Modal open={open} title="Input penjualan mingguan" info={INFO} onClose={onClose}>
      <SaleForm onClose={onClose} />
    </Modal>
  )
}

function SaleForm({ onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ product_id: '', week_start: lastFinishedMonday(), quantity: '' })
  const [clientErrors, setClientErrors] = useState({})
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api('/products') })

  const save = useMutation({
    mutationFn: () => api('/sales', { method: 'POST', body: { ...form, quantity: Number(form.quantity) } }),
    onSuccess: (sale) => {
      toast.success(`Penjualan ${sale.product.name} minggu ${formatDate(form.week_start)} tersimpan.`)
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['forecasts'] })
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
      <Field label="Produk" id="product_id" error={errors.product_id}>
        <select id="product_id" className={inputClass} value={form.product_id} onChange={set('product_id')} aria-invalid={Boolean(errors.product_id)}>
          <option value="">Pilih produk…</option>
          {products.data.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tanggal awal minggu (Senin)" id="week_start" error={errors.week_start} hint={`Minggu terakhir yang sudah selesai: ${formatDate(lastFinishedMonday())}`}>
        <input
          id="week_start"
          type="date"
          max={lastFinishedMonday()}
          className={inputClass}
          value={form.week_start}
          onChange={set('week_start')}
          aria-invalid={Boolean(errors.week_start)}
        />
      </Field>
      <Field label="Jumlah terjual dalam minggu itu" id="quantity" error={errors.quantity}>
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
