import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import './index.css'
import { router } from './router'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        richColors
        closeButton
        containerAriaLabel="Notifikasi"
        toastOptions={{ closeButtonAriaLabel: 'Tutup notifikasi' }}
      />
    </QueryClientProvider>
  </StrictMode>,
)
