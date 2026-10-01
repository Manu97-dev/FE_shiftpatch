import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom'
import { useAuth } from '../features/auth/auth.context'
import { LoginPage } from '../features/auth/login-page'
import { HomePage } from '../features/home/home-page'

export function AppRoutes() {
  const { session, status, retryRestore } = useAuth()
  if (status === 'loading') return <main className="page" role="status">Restoring your session…</main>
  if (status === 'error') return (
    <main className="page">
      <p role="alert">We could not restore your session. Check your connection and try again.</p>
      <button onClick={retryRestore}>Try again</button>
    </main>
  )
  return (
    <Routes>
      <Route path="/" element={<Navigate to={session ? '/home' : '/login'} replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/home" element={session ? <HomePage /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function AppRouter() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>
}
