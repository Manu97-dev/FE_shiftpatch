import { useAuth } from '../../features/auth/contexts/auth.context'
import { NurseShiftTabs } from '../../features/shifts/components/nurse-shift-tabs'
import { HomeLayout } from '../../shared/components/home-layout'
import styles from '../../shared/components/home-layout.module.scss'

export function NurseHomePage() {
  const { session } = useAuth()
  return <HomeLayout>
    <p className={styles.eyebrow}>Nurse home</p>
    <h1>Welcome back, {session?.user.name.split(' ')[0]}.</h1>
    <p className={styles.intro}>Keep track of your schedule and the care ahead.</p>
    <NurseShiftTabs />
  </HomeLayout>
}
