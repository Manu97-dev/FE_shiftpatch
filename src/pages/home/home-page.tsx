import type { ComponentType } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/contexts/auth.context'
import type { Session } from '../../features/auth/api/auth.schemas'
import { NurseHomePage } from '../nurse-home/nurse-home-page'
import { AgencyHomePage } from '../agency-home/agency-home-page'
import { AdminHomePage } from '../admin-home/admin-home-page'

const roleHomes: Record<Session['user']['role'], ComponentType> = {
  nurse: NurseHomePage, agency: AgencyHomePage, admin: AdminHomePage,
}
export function HomePage() {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  const RoleHome = roleHomes[session.user.role]
  return <RoleHome />
}
