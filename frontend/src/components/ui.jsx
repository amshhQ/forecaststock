import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Icon } from './icons'

export function PageHeader({ title, description, info, actions }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{title}</h1>
          {info && (
            <InfoTip label={`Keterangan halaman ${title}`}>
              <InfoSections info={info} />
            </InfoTip>
          )}
        </div>
        {description && <p className="mt-1 max-w-2xl text-sm text-stone-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function InfoTip({ label = 'Keterangan', align = 'left', children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const closeOutside = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
          open ? 'bg-teal-100 text-teal-900' : 'text-teal-700 hover:bg-teal-50'
        }`}
      >
        <Icon name="info" className="h-5 w-5" />
      </button>
      {open && (
        <div
          id={panelId}
          className={`absolute top-full z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-stone-200 bg-white p-4 text-left text-sm font-normal normal-case leading-relaxed tracking-normal text-stone-700 shadow-lg max-sm:fixed max-sm:inset-x-4 max-sm:top-16 max-sm:mt-0 max-sm:w-auto ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  )
}

const INFO_TITLES = {
  from: 'Datanya dari mana',
  needs: 'Syarat supaya muncul',
  how: 'Cara pakai',
  note: 'Perlu diketahui',
}

export function InfoSections({ info }) {
  return (
    <div className="space-y-3">
      {Object.entries(INFO_TITLES)
        .filter(([key]) => info[key]?.length)
        .map(([key, title]) => (
          <div key={key}>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">{title}</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {info[key].map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  )
}

export function Modal({ open, title, info, onClose, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) {
      dialog.showModal()
      dialog.querySelector('input, select, textarea')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby="judul-modal"
      className="m-auto w-[min(36rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] overflow-visible rounded-xl bg-transparent p-0 backdrop:bg-stone-900/40"
    >
      {open && (
        <div className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <h2 id="judul-modal" className="text-lg font-semibold text-stone-900">
                {title}
              </h2>
              {info && (
                <InfoTip label={`Keterangan ${title}`}>
                  <InfoSections info={info} />
                </InfoTip>
              )}
            </div>
            <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-lg px-2 py-1 text-xl leading-none text-stone-500 hover:bg-stone-100">
              ×
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

export function InfoLink({ to, children }) {
  return (
    <Link to={to} className="font-medium text-teal-800 underline">
      {children}
    </Link>
  )
}

const buttonStyles = {
  primary: 'bg-teal-700 text-white shadow-sm hover:bg-teal-800',
  secondary: 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  ghost: 'text-teal-800 hover:bg-teal-50',
}
const buttonBase =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

export function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return <button type={type} className={`${buttonBase} ${buttonStyles[variant]} ${className}`} {...props} />
}

export function LinkButton({ variant = 'primary', className = '', ...props }) {
  return <Link className={`${buttonBase} ${buttonStyles[variant]} ${className}`} {...props} />
}

export function Field({ label, error, id, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint && !error && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export const inputClass =
  'block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 aria-[invalid=true]:border-red-500'

export function Card({ className = '', children }) {
  return <div className={`rounded-xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>
}

export function Loading({ label = 'Memuat data…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-teal-700" aria-hidden="true" />
      {label}
    </div>
  )
}

export function ErrorMessage({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      <span>{error.message}</span>
      {onRetry && (
        <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  )
}

export function Empty({ title, children, action }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
      <p className="font-medium text-stone-800">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-stone-600">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

const statusStyles = {
  perlu_restock: ['Perlu restock', 'bg-amber-100 text-amber-900'],
  berlebih: ['Berlebih', 'bg-sky-100 text-sky-900'],
  aman: ['Aman', 'bg-emerald-100 text-emerald-900'],
  data_kurang: ['Data kurang', 'bg-stone-100 text-stone-700'],
}

export function StatusBadge({ status }) {
  const [label, style] = statusStyles[status] ?? [status, 'bg-stone-100 text-stone-700']
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{label}</span>
}

export function Table({ children }) {
  return (
    <>
      <p className="mb-1.5 text-xs text-stone-500 sm:hidden">Geser tabel ke samping untuk melihat kolom lain.</p>
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone-200 text-sm">{children}</table>
      </div>
    </>
  )
}

export const th = 'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-500'
export const td = 'whitespace-nowrap px-4 py-2.5 text-stone-800'

export function SortHeader({ label, column, sort, onSort, align = 'left' }) {
  const active = sort.key === column
  const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
  return (
    <th className={`${th} ${align === 'right' ? 'text-right' : ''}`} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 uppercase hover:text-stone-900 ${active ? 'text-stone-900' : ''}`}
      >
        {label}
        <span aria-hidden="true" className={active ? 'text-teal-700' : 'text-stone-300'}>
          {active && sort.direction === 'desc' ? '▼' : '▲'}
        </span>
      </button>
    </th>
  )
}

export function SearchInput({ id, label, value, onChange, placeholder }) {
  return (
    <div className="w-full sm:max-w-xs">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input id={id} type="search" placeholder={placeholder} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
