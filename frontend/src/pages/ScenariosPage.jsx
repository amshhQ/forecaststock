import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../api/client'
import { Button, Empty, ErrorMessage, Field, inputClass, Loading, Modal, PageHeader, SortHeader, Table, td, th } from '../components/ui'
import { sortRows, useSort } from '../lib/hooks'

const EMPTY = { name: '', adjustment_percent: '', category_id: '', description: '' }

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Nama wajib diisi.'
  const value = Number(form.adjustment_percent)
  if (form.adjustment_percent === '' || Number.isNaN(value)) errors.adjustment_percent = 'Isi angka persen, misalnya 25 atau -10.'
  else if (value < -100 || value > 500) errors.adjustment_percent = 'Penyesuaian harus di antara -100 dan 500.'
  return errors
}

const percentText = (value) => `${Number(value) > 0 ? '+' : ''}${Number(value)}%`

const INFO = {
  how: [
    'Isi persen positif untuk menaikkan prediksi dan negatif untuk menurunkannya.',
    'Pilih kategori kalau kondisinya hanya berpengaruh ke sebagian barang. Kosongkan untuk semua produk.',
    'Skenario dipilih di halaman Rekomendasi Stok.',
  ],
  note: ['Pola musim yang terjadi tiap tahun sudah dihitung otomatis. Skenario hanya untuk kondisi yang berbeda dari biasanya, misalnya hujan datang lebih awal atau ada promo. Kalau dipakai untuk pola yang rutin, pengaruhnya terhitung dua kali.'],
}

export default function ScenariosPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [sort, toggleSort] = useSort('name')

  const scenarios = useQuery({ queryKey: ['scenarios'], queryFn: () => api('/scenarios') })
  const remove = useMutation({
    mutationFn: (scenario) => api(`/scenarios/${scenario.id}`, { method: 'DELETE' }),
    onError: (error) => toast.error(error.message),
    onSuccess: (_, scenario) => {
      toast.success(`Skenario "${scenario.name}" dihapus.`)
      queryClient.invalidateQueries({ queryKey: ['scenarios'] })
    },
  })

  const rows = sortRows(scenarios.data ?? [], sort, (row, key) => (key === 'adjustment_percent' ? Number(row[key]) : key === 'category' ? row.category?.name : row[key]))

  return (
    <>
      <PageHeader
        info={INFO}
        title="Skenario Penyesuaian"
        description="Faktor koreksi manual untuk kondisi yang menyimpang dari pola penjualan biasa, seperti cuaca tidak biasa, hari besar, atau promo."
        actions={<Button onClick={() => setEditing({ id: null })}>Tambah skenario</Button>}
      />

      <ErrorMessage error={scenarios.error} onRetry={() => scenarios.refetch()} />

      {scenarios.isPending ? (
        <Loading />
      ) : scenarios.isError ? null : rows.length === 0 ? (
        <Empty title="Belum ada skenario">Tanpa skenario, rekomendasi stok dihitung dari prediksi apa adanya.</Empty>
      ) : (
        <Table>
          <thead className="bg-stone-50">
            <tr>
              <SortHeader label="Nama" column="name" sort={sort} onSort={toggleSort} />
              <SortHeader label="Penyesuaian" column="adjustment_percent" sort={sort} onSort={toggleSort} align="right" />
              <SortHeader label="Berlaku untuk" column="category" sort={sort} onSort={toggleSort} />
              <th className={th}>Keterangan</th>
              <th className={th}>
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((s) => (
              <tr key={s.id}>
                <td className={`${td} font-medium`}>{s.name}</td>
                <td className={`${td} text-right ${Number(s.adjustment_percent) < 0 ? 'text-red-700' : 'text-emerald-800'}`}>{percentText(s.adjustment_percent)}</td>
                <td className={td}>{s.category ? `Kategori ${s.category.name}` : 'Semua produk'}</td>
                <td className={`${td} min-w-56 whitespace-normal text-stone-600`}>{s.description ?? '–'}</td>
                <td className={`${td} text-right`}>
                  <Button variant="secondary" className="mr-2 px-2.5 py-1 text-xs" onClick={() => setEditing(s)}>
                    Ubah
                  </Button>
                  <Button
                    variant="danger"
                    className="px-2.5 py-1 text-xs"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Hapus skenario "${s.name}"?`)) remove.mutate(s)
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

      <Modal open={Boolean(editing)} title={editing?.id ? 'Ubah skenario' : 'Tambah skenario'} onClose={() => setEditing(null)}>
        {editing && <ScenarioForm key={editing.id ?? 'baru'} scenario={editing} onClose={() => setEditing(null)} />}
      </Modal>
    </>
  )
}

function ScenarioForm({ scenario, onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(
    scenario.id
      ? {
          name: scenario.name,
          adjustment_percent: String(Number(scenario.adjustment_percent)),
          category_id: scenario.category_id ?? '',
          description: scenario.description ?? '',
        }
      : EMPTY,
  )
  const [clientErrors, setClientErrors] = useState({})
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api('/categories') })

  const save = useMutation({
    mutationFn: () =>
      api(scenario.id ? `/scenarios/${scenario.id}` : '/scenarios', {
        method: scenario.id ? 'PUT' : 'POST',
        body: {
          name: form.name.trim(),
          adjustment_percent: Number(form.adjustment_percent),
          category_id: form.category_id || null,
          description: form.description.trim() || null,
        },
      }),
    onSuccess: (saved) => {
      toast.success(scenario.id ? `Skenario "${saved.name}" diperbarui.` : `Skenario "${saved.name}" ditambahkan.`)
      queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      queryClient.invalidateQueries({ queryKey: ['forecasts', 'recommendations'] })
      onClose()
    },
  })

  const errors = { ...save.error?.fieldErrors, ...clientErrors }
  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
    setClientErrors({ ...clientErrors, [field]: undefined })
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama" id="sc-name" error={errors.name}>
          <input id="sc-name" className={inputClass} value={form.name} maxLength={100} onChange={set('name')} aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Penyesuaian (%)" id="sc-percent" error={errors.adjustment_percent} hint="Negatif untuk menurunkan, misalnya -10">
          <input
            id="sc-percent"
            type="number"
            step="0.01"
            min={-100}
            max={500}
            className={inputClass}
            value={form.adjustment_percent}
            onChange={set('adjustment_percent')}
            aria-invalid={Boolean(errors.adjustment_percent)}
          />
        </Field>
      </div>
      <Field label="Berlaku untuk" id="sc-category" error={errors.category_id} hint="Kosongkan kalau berpengaruh ke semua barang">
        <select id="sc-category" className={inputClass} value={form.category_id} onChange={set('category_id')} disabled={categories.isPending}>
          <option value="">Semua produk</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              Kategori {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Keterangan (opsional)" id="sc-desc" error={errors.description}>
        <input id="sc-desc" className={inputClass} value={form.description} maxLength={1000} onChange={set('description')} />
      </Field>
      {save.isError && !Object.keys(save.error.fieldErrors).length && <ErrorMessage error={save.error} />}
      <div className="flex justify-end gap-2">
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
