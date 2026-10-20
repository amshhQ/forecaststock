import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import { Button, Card, ErrorMessage, Field, inputClass, PageHeader } from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import { toast } from 'sonner'

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Nama wajib diisi.'
  if (!form.store_name.trim()) errors.store_name = 'Nama toko wajib diisi.'
  if (!form.business_type) errors.business_type = 'Pilih jenis toko.'
  return errors
}

const INFO = {
  how: ['Jenis toko menentukan kategori awal dan saran satuan barang. Cara hitung prediksinya sama untuk semua jenis toko.'],
  note: [
    'ForecastStock dibuat untuk usaha yang menjual barang dan punya stok. Usaha jasa tanpa stok barang tidak cocok.',
    'Mengganti jenis toko tidak menghapus kategori dan produk yang sudah ada.',
  ],
}

export default function SettingsPage() {
  const { token, user, login } = useAuthStore()
  const [form, setForm] = useState({
    name: user?.name ?? '',
    store_name: user?.store_name ?? '',
    business_type: user?.business_type ?? '',
  })
  const [clientErrors, setClientErrors] = useState({})
  const types = useQuery({ queryKey: ['business-types'], queryFn: () => api('/business-types'), staleTime: Infinity })

  const save = useMutation({
    mutationFn: () => api('/store', { method: 'PUT', body: { ...form, name: form.name.trim(), store_name: form.store_name.trim() } }),
    onSuccess: (updated) => {
      login(token, updated)
      toast.success('Pengaturan toko disimpan.')
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
    if (Object.keys(found).length === 0) save.mutate()
  }

  const selected = types.data?.find((t) => t.value === form.business_type)

  return (
    <>
      <PageHeader info={INFO} title="Pengaturan Toko" description="Nama toko dan jenis barang yang dijual. ForecastStock dipakai untuk usaha yang menjual barang dan punya stok, bukan usaha jasa." />
      <Card className="max-w-xl">
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Field label="Nama pemilik" id="name" error={errors.name}>
            <input id="name" className={inputClass} value={form.name} onChange={set('name')} maxLength={100} aria-invalid={Boolean(errors.name)} />
          </Field>
          <Field label="Nama toko" id="store_name" error={errors.store_name}>
            <input
              id="store_name"
              className={inputClass}
              value={form.store_name}
              onChange={set('store_name')}
              maxLength={100}
              aria-invalid={Boolean(errors.store_name)}
            />
          </Field>
          <Field
            label="Jenis toko"
            id="business_type"
            error={errors.business_type}
            hint={selected ? `Saran satuan: ${selected.units.join(', ')}` : undefined}
          >
            <select
              id="business_type"
              className={inputClass}
              value={form.business_type}
              onChange={set('business_type')}
              disabled={types.isPending}
              aria-invalid={Boolean(errors.business_type)}
            >
              <option value="">{types.isPending ? 'Memuat…' : 'Pilih jenis toko'}</option>
              {types.data?.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          {save.isError && !Object.keys(save.error.fieldErrors ?? {}).length && <ErrorMessage error={save.error} />}

          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </form>
      </Card>
    </>
  )
}
