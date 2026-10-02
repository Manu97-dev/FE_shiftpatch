import { HomeLayout } from '../../shared/components/home-layout'
import { AdminDashboard } from '../../features/admin/components/admin-dashboard'
import styles from '../../shared/components/home-layout.module.scss'
export function AdminHomePage() {
  return <HomeLayout><p className={styles.eyebrow}>Admin home</p><h1>Shift overview</h1><p className={styles.intro}>Monitor coverage and assignments across all agencies.</p><AdminDashboard /></HomeLayout>
}
