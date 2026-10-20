const numberFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatNumber = (value) => (value === null || value === undefined ? '–' : numberFormat.format(value))

export function formatDate(isoDate) {
  if (!isoDate) return '–'
  const [year, month, day] = isoDate.split('-').map(Number)
  return dateFormat.format(new Date(year, month - 1, day))
}

export function currentMonday() {
  const today = new Date()
  const diff = (today.getDay() + 6) % 7
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diff)
  const pad = (n) => String(n).padStart(2, '0')
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`
}

export function lastFinishedMonday() {
  const [year, month, day] = currentMonday().split('-').map(Number)
  const monday = new Date(year, month - 1, day - 7)
  const pad = (n) => String(n).padStart(2, '0')
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`
}

export function mapeLabel(mape) {
  if (mape === null || mape === undefined) return null
  if (mape < 10) return 'sangat baik'
  if (mape < 20) return 'baik'
  if (mape <= 50) return 'cukup'
  return 'kurang akurat'
}
