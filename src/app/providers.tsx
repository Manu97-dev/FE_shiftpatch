import { useState, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Tooltip } from 'radix-ui'
import { AuthProvider } from '../features/auth/contexts/auth-provider'
import { ThemeProvider } from '../shared/contexts/theme-provider'

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: false,
      },
      mutations: { retry: false },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider><Tooltip.Provider>{children}</Tooltip.Provider></AuthProvider>
      </ThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
