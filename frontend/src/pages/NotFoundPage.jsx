import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">Halaman tidak ditemukan</h1>
      <Link to="/" className="mt-4 inline-block font-medium text-teal-800 hover:underline">
        Kembali ke dashboard
      </Link>
    </div>
  )
}
