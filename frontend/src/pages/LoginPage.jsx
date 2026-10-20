import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { api } from '../api/client'
import { Logo } from '../components/icons'
import { Button, Field, inputClass } from '../components/ui'
import { useAuthStore } from '../stores/authStore'

const DEMO = { email: 'demo@forecaststock.test', password: 'demo12345' }

function validate(form) {
  const errors = {}
  if (!form.email.trim()) errors.email = 'Email wajib diisi.'
  else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Format email belum benar.'
  if (!form.password) errors.password = 'Password wajib diisi.'
  return errors
}

export default function LoginPage() {
  const { token, login, sessionExpired } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [clientErrors, setClientErrors] = useState({})

  const mutation = useMutation({
    mutationFn: () => api('/login', { method: 'POST', body: { ...form, email: form.email.trim() } }),
    onSuccess: (data) => {
      login(data.token, data.user)
      navigate('/', { replace: true })
    },
  })

  if (token) return <Navigate to="/" replace />

  const errors = { ...mutation.error?.fieldErrors, ...clientErrors }

  function handleSubmit(e) {
    e.preventDefault()
    const found = validate(form)
    setClientErrors(found)
    if (Object.keys(found).length === 0) mutation.mutate()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <Logo />
          <div>
            <p className="font-semibold text-stone-900">ForecastStock</p>
            <p className="text-xs text-stone-500">Prediksi penjualan &amp; perencanaan stok</p>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-stone-900">Masuk</h1>
          <p className="mt-1 text-sm text-stone-600">Lihat prediksi penjualan tiap barang dan rekomendasi stok untuk minggu depan.</p>

          {sessionExpired && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
              Sesi kamu sudah berakhir. Silakan masuk lagi.
            </p>
          )}

          <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
            <Field label="Email" id="email" error={errors.email}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={inputClass}
                value={form.email}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Password" id="password" error={errors.password}>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={inputClass}
                value={form.password}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>

            {mutation.isError && !mutation.error.fieldErrors?.email && !mutation.error.fieldErrors?.password && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {mutation.error.message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Memeriksa…' : 'Masuk'}
            </Button>
          </form>
        </div>

        <div className="mt-4 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
          <p>
            Mau mencoba? Pakai akun demo yang sudah berisi <strong>data simulasi</strong> 6 produk selama 104 minggu.
          </p>
          <Button
            variant="ghost"
            className="mt-2 px-2 py-1 text-xs"
            onClick={() => {
              setForm(DEMO)
              setClientErrors({})
            }}
          >
            Isi otomatis akun demo
          </Button>
        </div>

        <p className="mt-4 text-center text-sm text-stone-600">
          Belum punya akun?{' '}
          <Link to="/daftar" className="font-medium text-teal-800 hover:underline">
            Daftar untuk toko kamu
          </Link>
        </p>
      </div>
    </main>
  )
}
