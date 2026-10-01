import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { HomePage } from '../features/home/home-page'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={
          <main className="page">
            <h1>Page not found</h1>
            <Link to="/">Return to Shiftpatch</Link>
          </main>
        } />
      </Routes>
    </BrowserRouter>
  )
}
