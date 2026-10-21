import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../api/client'
import { formatDate, formatNumber, todayDate } from '../lib/format'
import { Button, ErrorMessage, Field, inputClass, Loading, Modal, Table, td, th } from './ui'

const TYPES = {
  masuk: { label: 'Barang masuk dari pemasok', quantity: 'Jumlah yang masuk' },
  rusak: { label: 'Barang rusak, kedaluwarsa, atau hilang', quantity: 'Jumlah yang keluar' },
  opname: { label: 'Stok opname (hasil hitung di rak/gudang)', quantity: 'Jumlah hasil hitung' },
}

const HISTORY_LABELS = { awal: 'Stok awal', masuk: 'Barang masuk', terjual: 'Terjual', rusak: 'Rusak/hilang', opname: 'Stok opname' }

const INFO = {
  how: [
    'Barang masuk menambah stok, misalnya setelah belanja ke pemasok.',
    'Barang rusak, kedaluwarsa, atau hilang mengurangi stok.',
    'Stok opname menyamakan stok di aplikasi dengan hasil hitung langsung. Selisihnya tercatat di riwayat.',
  ],
  note: ['Penjualan mengurangi stok otomatis, jadi tidak perlu dicatat di sini.'],
}

export default function StockModal({ productId, onClose }) {
  const product = useQuery({ queryKey: ['product', productId], queryFn: () => api(`/products/${productId}`), enabled: Boolean(productId), retry: false })
  const title = product.data ? `Stok ${product.data.name}` : 'Stok barang'

  return (
    <Modal open={Boolean(productId)} title={title} info={INFO} onClose={onClose}>
      {product.isPending ? <Loading /> : product.isError ? <ErrorMessage error={product.error} /> : <StockPanel key={productId} product={product.data} />}
    </Modal>
  )
}

function StockPanel({ product }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ type: 'masuk', quantity: '', moved_on: todayDate(), note: '' })
  const [clientErrors, setClientErrors] = useState({})
  const movements = useQuery({ queryKey: ['movements', product.id], queryFn: () => api(`/products/${product.id}/movements`) })

  const save = useMutation({
    mutationFn: () =>
      api(`/products/${product.id}/movements`, {
        method: 'POST',
        body: { type: form.type, quantity: Number(form.quantity), moved_on: form.moved_on, note: form.note.trim() || null },
      }),
    onSuccess: (saved) => {
      toast.success(`${HISTORY_LABELS[saved.type]} tersimpan. Stok ${product.name} sekarang ${formatNumber(saved.current_stock)} ${product.unit}.`)
      setForm({ ...form, quantity: '', note: '' })
      queryClient.invalidateQueries({ queryKey: ['product', String(product.id)] })
      queryClient.invalidateQueries({ queryKey: ['movements', product.id] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['forecasts'] })
    },
  })

  const errors = { ...save.error?.fieldErrors, ...clientErrors }
  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
    setClientErrors({ ...clientErrors, [field]: undefined })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const found = {}
    const quantity = Number(form.quantity)
    const min = form.type === 'opname' ? 0 : 1
    if (form.quantity === '' || !Number.isInteger(quantity) || quantity < min) found.quantity = `Isi bilangan bulat ${min} atau lebih.`
    if (!form.moved_on) found.moved_on = 'Isi tanggal.'
    else if (form.moved_on > todayDate()) found.moved_on = 'Tanggal ini belum terjadi.'
    setClientErrors(found)
    if (Object.keys(found).length === 0) save.mutate()
  }

  return (
    <>
      <p className="mb-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
        Stok saat ini: <strong>{formatNumber(product.current_stock)} {product.unit}</strong>, stok minimum {formatNumber(product.min_stock)}
      </p>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Field label="Jenis catatan" id="stock-type">
          <select id="stock-type" className={inputClass} value={form.type} onChange={set('type')}>
            {Object.entries(TYPES).map(([value, type]) => (
              <option key={value} value={value}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={TYPES[form.type].quantity} id="stock-quantity" error={errors.quantity}>
            <input id="stock-quantity" type="number" min={0} step={1} inputMode="numeric" className={inputClass} value={form.quantity} onChange={set('quantity')} aria-invalid={Boolean(errors.quantity)} />
          </Field>
          <Field label="Tanggal" id="stock-date" error={errors.moved_on}>
            <input id="stock-date" type="date" max={todayDate()} className={inputClass} value={form.moved_on} onChange={set('moved_on')} aria-invalid={Boolean(errors.moved_on)} />
          </Field>
        </div>
        <Field label="Keterangan (opsional)" id="stock-note" error={errors.note}>
          <input id="stock-note" className={inputClass} value={form.note} maxLength={255} onChange={set('note')} placeholder="Misalnya nama pemasok atau alasan" />
        </Field>
        {save.isError && !Object.keys(save.error.fieldErrors).length && <ErrorMessage error={save.error} />}
        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
      </form>

      <h3 className="mb-2 mt-6 font-semibold text-stone-800">Riwayat stok</h3>
      {movements.isPending ? (
        <Loading />
      ) : movements.isError ? (
        <ErrorMessage error={movements.error} />
      ) : movements.data.length === 0 ? (
        <p className="text-sm text-stone-600">Belum ada perubahan stok yang tercatat.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          <Table>
            <thead className="bg-stone-50">
              <tr>
                <th className={th}>Tanggal</th>
                <th className={th}>Jenis</th>
                <th className={`${th} text-right`}>Perubahan</th>
                <th className={th}>Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {movements.data.map((m) => (
                <tr key={m.id}>
                  <td className={td}>{formatDate(m.moved_on)}</td>
                  <td className={td}>{HISTORY_LABELS[m.type] ?? m.type}</td>
                  <td className={`${td} text-right font-medium ${m.quantity < 0 ? 'text-red-700' : 'text-emerald-800'}`}>
                    {m.quantity > 0 ? '+' : ''}
                    {formatNumber(m.quantity)}
                  </td>
                  <td className={`${td} whitespace-normal text-stone-600`}>{m.note ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </>
  )
}
