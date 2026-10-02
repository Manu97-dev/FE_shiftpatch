import type { ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import styles from './confirmation-dialog.module.scss'

interface Props {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string
  confirmLabel: string; pendingLabel: string; pending: boolean; onConfirm: () => void
  error?: ReactNode; canConfirm?: boolean; children: ReactNode
}
export function ConfirmationDialog({ open, onOpenChange, title, description, confirmLabel, pendingLabel, pending, onConfirm, error, canConfirm = true, children }: Props) {
  return <Dialog.Root open={open} onOpenChange={(value) => { if (!pending) onOpenChange(value) }}>
    <Dialog.Portal>
      <Dialog.Overlay className={styles.overlay} />
      <Dialog.Content className={styles.content} onEscapeKeyDown={(event) => { if (pending) event.preventDefault() }} onPointerDownOutside={(event) => { if (pending) event.preventDefault() }}>
        <Dialog.Title className={styles.title}>{title}</Dialog.Title>
        <Dialog.Description className={styles.description}>{description}</Dialog.Description>
        {children}
        {error && <div data-testid="notification-banner" role="alert" className={styles.error}>{error}</div>}
        <div className={styles.actions}>
          <Dialog.Close asChild><button disabled={pending} className={styles.secondary}>{canConfirm ? 'Go back' : 'Close'}</button></Dialog.Close>
          {canConfirm && <button disabled={pending} className={styles.primary} onClick={onConfirm}>{pending ? pendingLabel : confirmLabel}</button>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
