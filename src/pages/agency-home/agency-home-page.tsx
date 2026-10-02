import { HomeLayout } from '../../shared/components/home-layout'
import { AgencyDashboard } from '../../features/agencies/components/agency-dashboard'
import styles from '../../shared/components/home-layout.module.scss'

export function AgencyHomePage() {
  return <HomeLayout>
    <p className={styles.eyebrow}>Agency home</p>
    <h1>Your agency shifts</h1>
    <p className={styles.intro}>Monitor open opportunities and assigned shifts.</p>
    <AgencyDashboard />
  </HomeLayout>
}
