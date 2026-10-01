import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom'
import { useAuth } from '../features/auth/auth.context'
import { LoginPage } from '../features/auth/login-page'
import { HomePage } from '../features/home/home-page'

export function AppRoutes() {
  const { session } = useAuth()
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
