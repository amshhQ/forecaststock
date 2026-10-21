import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../api/client'
import { todayDate } from '../lib/format'
import { Button, ErrorMessage, Field, Modal } from './ui'

const MAX_SIZE = 1024 * 1024

function checkFile(file) {
  if (!file) return 'Pilih file CSV dulu.'
  if (!/\.(csv|txt)$/i.test(file.name)) return 'File harus berformat .csv.'
  if (file.size === 0) return 'File kosong.'
  if (file.size > MAX_SIZE) return 'Ukuran file maksimal 1 MB.'
  return null
}

const INFO = {
  how: [
    'Kolom wajib: sku, date (tanggal penjualan, format YYYY-MM-DD), dan quantity. File dari Excel versi Indonesia juga bisa dibaca.',
    'Cara paling mudah: unduh contoh CSV, ubah angkanya, lalu unggah.',
  ],
  note: [
    'Baris yang benar langsung disimpan. Baris yang salah dilewati dan ditampilkan alasannya.',
    'Centang Kurangi stok kalau file berisi penjualan terbaru yang belum dicatat. Biarkan kosong untuk riwayat lama, karena stok sekarang sudah hasil hitung langsung.',
  ],
}

export default function SalesImportModal({ open, onClose }) {
  return (
    <Modal open={open} title="Impor penjualan dari CSV" info={INFO} onClose={onClose}>
      <SalesImport onClose={onClose} />
    </Modal>
  )
}

function SalesImport({ onClose }) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [reduceStock, setReduceStock] = useState(false)
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api('/products') })

  const upload = useMutation({
    mutationFn: () => {
      const body = new FormData()
      body.append('file', file)
      body.append('reduce_stock', reduceStock ? '1' : '0')
      return api('/sales/import', { method: 'POST', body })
    },
    onSuccess: (result) => {
      toast.success(`${result.imported} baris berhasil diimpor.`)
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['forecasts'] })
      queryClient.invalidateQueries({ queryKey: ['movements'] })
    },
  })

  function downloadExample() {
    const day = todayDate()
    const lines = ['sku,date,quantity', ...(products.data ?? []).slice(0, 3).map((p, i) => `${p.sku},${day},${(i + 1) * 2}`)]
    if (lines.length === 1) lines.push(`KODE-BARANG,${day},2`)
    const url = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'contoh-penjualan.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          const problem = checkFile(file)
          setFileError(problem)
          if (!problem) upload.mutate()
        }}
      >
        <Field label="File CSV" id="csv" error={fileError ?? upload.error?.fieldErrors?.file} hint="Maksimal 1 MB">
          <input
            id="csv"
            type="file"
            accept=".csv,text/csv"
            className="block w-full rounded-lg border border-stone-300 bg-white text-sm file:mr-3 file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:text-stone-700"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setFileError(null)
              upload.reset()
            }}
          />
        </Field>
        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal-700" checked={reduceStock} onChange={(e) => setReduceStock(e.target.checked)} />
          <span>
            <span className="font-medium">Kurangi stok</span> sesuai penjualan di file. Biarkan kosong kalau file berisi riwayat lama.
          </span>
        </label>
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="secondary" onClick={downloadExample} disabled={products.isPending}>
            Unduh contoh CSV
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              {upload.isSuccess ? 'Selesai' : 'Batal'}
            </Button>
            <Button type="submit" disabled={!file || upload.isPending}>
              {upload.isPending ? 'Mengimpor…' : 'Impor'}
            </Button>
          </div>
        </div>
      </form>

      {upload.isError && !upload.error.fieldErrors?.file && (
        <div className="mt-4">
          <ErrorMessage error={upload.error} />
        </div>
      )}

      {upload.isSuccess && (
        <div className="mt-4 space-y-2" aria-live="polite">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{upload.data.imported} baris berhasil disimpan.</p>
          {upload.data.errors.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">{upload.data.errors.length} baris dilewati:</p>
              <ul className="mt-1 max-h-48 list-disc overflow-y-auto pl-5">
                {upload.data.errors.map((err) => (
                  <li key={err.line}>
                    Baris {err.line}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  )
}
