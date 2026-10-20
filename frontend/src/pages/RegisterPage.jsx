import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { api } from '../api/client'
import { Logo } from '../components/icons'
import { Button, Field, inputClass } from '../components/ui'
import { useAuthStore } from '../stores/authStore'

const EMPTY = { name: '', store_name: '', business_type: '', email: '', password: '', password_confirmation: '' }

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Nama wajib diisi.'
  if (!form.store_name.trim()) errors.store_name = 'Nama toko wajib diisi.'
  if (!form.business_type) errors.business_type = 'Pilih jenis toko.'
  if (!form.email.trim()) errors.email = 'Email wajib diisi.'
  else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Format email belum benar.'
  if (form.password.length < 8) errors.password = 'Password minimal 8 karakter.'
  else if (form.password !== form.password_confirmation) errors.password_confirmation = 'Konfirmasi password belum sama.'
  return errors
}

export default function RegisterPage() {
  const { token, login } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [clientErrors, setClientErrors] = useState({})
  const types = useQuery({ queryKey: ['business-types'], queryFn: () => api('/business-types'), staleTime: Infinity })

  const mutation = useMutation({
    mutationFn: () =>
      api('/register', {
        method: 'POST',
        body: { ...form, name: form.name.trim(), store_name: form.store_name.trim(), email: form.email.trim() },
      }),
    onSuccess: (data) => {
      login(data.token, data.user)
      navigate('/', { replace: true })
    },
  })

  if (token) return <Navigate to="/" replace />

  const errors = { ...mutation.error?.fieldErrors, ...clientErrors }
  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
    setClientErrors({ ...clientErrors, [field]: undefined })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const found = validate(form)
    setClientErrors(found)
    if (Object.keys(found).length === 0) mutation.mutate()
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
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <Logo />
          <div>
            <p className="font-semibold text-stone-900">ForecastStock</p>
            <p className="text-xs text-stone-500">Prediksi penjualan &amp; perencanaan stok</p>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-stone-900">Daftar akun toko</h1>
          <p className="mt-1 text-sm text-stone-600">Untuk toko yang menjual barang dan punya stok. Kategori awal dan saran satuan disesuaikan dengan jenis tokonya.</p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
            <Field label="Nama kamu" id="name" error={errors.name}>
              {input('name', { autoComplete: 'name', maxLength: 100 })}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama toko" id="store_name" error={errors.store_name}>
                {input('store_name', { maxLength: 100 })}
              </Field>
              <Field label="Jenis toko" id="business_type" error={errors.business_type}>
                <select
                  id="business_type"
                  className={inputClass}
                  value={form.business_type}
                  onChange={set('business_type')}
                  aria-invalid={Boolean(errors.business_type)}
                  aria-describedby={errors.business_type ? 'business_type-error' : undefined}
                  disabled={types.isPending}
                >
                  <option value="">{types.isPending ? 'Memuat…' : 'Pilih jenis toko'}</option>
                  {types.data?.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Email" id="email" error={errors.email}>
              {input('email', { type: 'email', autoComplete: 'email' })}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" id="password" error={errors.password} hint="Minimal 8 karakter">
                {input('password', { type: 'password', autoComplete: 'new-password' })}
              </Field>
              <Field label="Ulangi password" id="password_confirmation" error={errors.password_confirmation}>
                {input('password_confirmation', { type: 'password', autoComplete: 'new-password' })}
              </Field>
            </div>

            {mutation.isError && !Object.keys(mutation.error.fieldErrors ?? {}).length && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {mutation.error.message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Mendaftarkan…' : 'Daftar'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-stone-600">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-medium text-teal-800 hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </main>
  )
}
