const numberFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatNumber = (value) => (value === null || value === undefined ? '-' : numberFormat.format(value))

export function formatDate(isoDate) {
  if (!isoDate) return '-'
  const [year, month, day] = isoDate.split('-').map(Number)
  return dateFormat.format(new Date(year, month - 1, day))
}

const shortDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' })

export function addDays(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatWeek(monday) {
  const sunday = addDays(monday, 6)
  const [startYear, startMonth, startDay] = monday.split('-').map(Number)
  const sameMonth = monday.slice(0, 7) === sunday.slice(0, 7)
  const start = sameMonth ? String(startDay) : shortDate.format(new Date(startYear, startMonth - 1, startDay))
  return monday.slice(0, 4) === sunday.slice(0, 4) ? `${start} sampai ${formatDate(sunday)}` : `${formatDate(monday)} sampai ${formatDate(sunday)}`
}

export function weekLabel(monday) {
  const current = currentMonday()
  if (monday === current) return `minggu ini (${formatWeek(monday)})`
  if (monday === addDays(current, 7)) return `minggu depan (${formatWeek(monday)})`
  return `minggu ${formatWeek(monday)}`
}

export function currentMonday() {
  const today = new Date()
  const diff = (today.getDay() + 6) % 7
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diff)
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

export function todayDate() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function mondayOf(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
