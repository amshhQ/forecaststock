import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { api } from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { Icon, Logo } from './icons'

const MENU = [
  {
    label: 'Data Master',
    items: [
      { to: '/kategori', label: 'Kategori', icon: 'tag' },
      { to: '/produk', label: 'Produk & Stok', icon: 'box' },
      { to: '/skenario', label: 'Skenario', icon: 'sliders' },
    ],
  },
  {
    label: 'Transaksi',
    items: [{ to: '/penjualan', label: 'Penjualan Mingguan', icon: 'cart' }],
  },
  {
    label: 'Analisis',
    items: [
      { to: '/prediksi', label: 'Prediksi', icon: 'chart' },
      { to: '/rekomendasi', label: 'Rekomendasi Stok', icon: 'clipboard' },
    ],
  },
  {
    label: 'Akun',
    items: [{ to: '/pengaturan', label: 'Pengaturan Toko', icon: 'store' }],
  },
]

const linkClass = ({ isActive }) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive ? 'bg-teal-50 font-semibold text-teal-900' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
  }`

export default function Layout() {
  const { token, user, login, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = useQuery({ queryKey: ['me'], queryFn: () => api('/me'), enabled: Boolean(token) })

  const resetDemo = useMutation({
    mutationFn: () => api('/demo/reset', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries()
      toast.success('Data demo sudah dikembalikan ke kondisi awal.')
    },
    onError: (error) => toast.error(error.message),
  })

  useEffect(() => {
    if (me.data && token) login(token, me.data)
  }, [me.data, token, login])

  if (!token) return <Navigate to="/login" replace />

  async function handleLogout() {
    await api('/logout', { method: 'POST' }).catch(() => null)
    logout()
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-stone-50 md:flex">
      <a href="#konten" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Lewati ke konten
      </a>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <span className="flex items-center gap-2 font-semibold text-stone-900">
          <Logo /> ForecastStock
        </span>
        <button
          type="button"
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          aria-expanded={menuOpen}
          aria-controls="menu-utama"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? 'Tutup' : 'Menu'}
        </button>
      </header>

      <aside
        id="menu-utama"
        className={`${menuOpen ? 'flex' : 'hidden'} flex-col border-b border-stone-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r`}
      >
        <div className="hidden items-center gap-2.5 px-5 py-5 md:flex">
          <Logo />
          <div className="min-w-0">
            <p className="font-semibold leading-tight text-stone-900">ForecastStock</p>
            <p className="truncate text-xs text-stone-500">{user?.store_name || 'Prediksi penjualan & stok'}</p>
          </div>
        </div>
        <nav aria-label="Menu utama" className="flex-1 overflow-y-auto px-3 py-2">
          <NavLink to="/" end onClick={() => setMenuOpen(false)} className={linkClass}>
            <Icon name="dashboard" />
            Dashboard
          </NavLink>

          {MENU.map((group) => (
            <div key={group.label} className="mt-5">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-500">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} onClick={() => setMenuOpen(false)} className={linkClass}>
                      <Icon name={item.icon} />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-stone-200 px-5 py-4 text-sm">
          <p className="truncate font-medium text-stone-800">{user?.name}</p>
          <p className="truncate text-xs text-stone-500">{user?.email}</p>
          <button type="button" onClick={handleLogout} className="mt-2 text-sm font-medium text-red-700 hover:underline">
            Keluar
          </button>
        </div>
      </aside>

      <main id="konten" className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">
          {user?.is_demo && (
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
              <span>
                Akun demo: data penjualan adalah <strong>data simulasi</strong>, bukan data pasar asli.
              </span>
              <button
                type="button"
                className="font-semibold underline hover:no-underline disabled:opacity-50"
                disabled={resetDemo.isPending}
                onClick={() => {
                  if (window.confirm('Kembalikan semua data akun demo ke kondisi awal? Perubahan yang kamu buat akan hilang.')) resetDemo.mutate()
                }}
              >
                {resetDemo.isPending ? 'Mengembalikan…' : 'Reset data demo'}
              </button>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
