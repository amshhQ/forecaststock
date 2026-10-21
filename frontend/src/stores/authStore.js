import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      sessionExpired: false,
      login: (token, user) => set({ token, user, sessionExpired: false }),
      logout: () => set({ token: null, user: null, sessionExpired: false }),
      expire: () => set({ token: null, user: null, sessionExpired: true }),
    }),
    // Yang disimpan di browser hanya token dan data akun, supaya tetap login setelah refresh.
    { name: 'forecaststock-auth', partialize: (state) => ({ token: state.token, user: state.user }) },
  ),
)
