import { useAuthStore } from '../stores/authStore'

export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const STATUS_MESSAGES = {
  403: 'Kamu tidak punya akses untuk aksi ini.',
  404: 'Data tidak ditemukan. Mungkin sudah dihapus.',
  413: 'File terlalu besar.',
  429: 'Terlalu banyak percobaan. Tunggu sekitar satu menit lalu coba lagi.',
  500: 'Terjadi kesalahan di server. Coba lagi beberapa saat.',
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = useAuthStore.getState().token
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let payload
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`/api${path}`, { method, headers, body: payload })
  } catch {
    throw new ApiError('Tidak bisa terhubung ke server. Pastikan backend sudah dinyalakan.', 0)
  }

  if (response.status === 401 && token) {
    useAuthStore.getState().expire()
    throw new ApiError('Sesi kamu sudah berakhir. Silakan login lagi.', 401)
  }
  if (response.status === 204) return null

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const fieldErrors = {}
    for (const [field, messages] of Object.entries(data?.errors ?? {})) {
      fieldErrors[field] = messages[0]
    }
    const serverMessage = response.status === 422 || response.status === 403 ? data?.message : null
    throw new ApiError(serverMessage ?? STATUS_MESSAGES[response.status] ?? `Permintaan gagal (${response.status}).`, response.status, fieldErrors)
  }
  return data
}
