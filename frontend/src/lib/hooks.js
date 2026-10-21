import { useEffect, useState } from 'react'

// Pencarian menunggu pengguna berhenti mengetik, supaya API tidak dipanggil di setiap huruf.
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}

export function useSort(defaultKey, defaultDirection = 'asc') {
  const [sort, setSort] = useState({ key: defaultKey, direction: defaultDirection })

  const toggle = (key) =>
    setSort((current) =>
      current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' },
    )

  return [sort, toggle]
}

const collator = new Intl.Collator('id', { numeric: true, sensitivity: 'base' })

export function sortRows(rows, { key, direction }, getValue) {
  const factor = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = getValue(a, key)
    const y = getValue(b, key)
    if (x === null || x === undefined) return 1
    if (y === null || y === undefined) return -1
    const result = typeof x === 'number' && typeof y === 'number' ? x - y : collator.compare(String(x), String(y))
    return result * factor
  })
}

export function matches(text, keyword) {
  return String(text ?? '').toLowerCase().includes(keyword.trim().toLowerCase())
}
