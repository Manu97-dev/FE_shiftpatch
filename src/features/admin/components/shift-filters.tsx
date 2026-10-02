import { useEffect, useRef, useState } from 'react'
import { filterSchema, type FilterForm } from '../api/admin.schemas'
import type { ShiftFilters } from '../../shifts/api/shifts.api'
import styles from './admin-dashboard.module.scss'
const defaults: FilterForm = { agencyId: '', status: '', dateFrom: '', dateTo: '' }
export function ShiftFilterForm({ agencies, onApply }: { agencies: { id: string; name: string }[]; onApply: (filters: ShiftFilters) => void }) {
  const [values, setValues] = useState<FilterForm>(defaults)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const validation = filterSchema.safeParse(values)
  const errors = validation.success ? {} : validation.error.flatten().fieldErrors
  function change(field: keyof FilterForm, value: string) {
    const next = { ...values, [field]: value }
    setValues(next)
    clearTimeout(timer.current)
    const result = filterSchema.safeParse(next)
    if (!result.success) return
    const parsed = result.data
    const filters: ShiftFilters = {
      ...(parsed.agencyId && { agencyId: parsed.agencyId }), ...(parsed.status && { status: parsed.status }),
      ...(parsed.dateFrom && { dateFrom: parsed.dateFrom }), ...(parsed.dateTo && { dateTo: parsed.dateTo }),
    }
    if (field === 'agencyId' || field === 'status') onApply(filters)
    else timer.current = setTimeout(() => onApply(filters), 300)
  }
  return <form className={styles.filters} aria-label="Shift filters" noValidate onSubmit={(event) => event.preventDefault()}>
    <div><label htmlFor="filter-agency">Agency</label><select id="filter-agency" value={values.agencyId} onChange={(event) => change('agencyId', event.target.value)}><option value="">All agencies</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></div>
    <div><label htmlFor="filter-status">Status</label><select id="filter-status" value={values.status} onChange={(event) => change('status', event.target.value)}><option value="">All statuses</option><option value="open">Open</option><option value="filled">Assigned</option></select></div>
    <div><label htmlFor="filter-from">Start date from</label><input id="filter-from" type="date" max="9999-12-31" value={values.dateFrom} onChange={(event) => change('dateFrom', event.target.value)} aria-invalid={Boolean(errors.dateFrom)} aria-describedby={errors.dateFrom ? 'filter-from-error' : undefined} />{errors.dateFrom && <p role="alert" id="filter-from-error">Enter a valid date.</p>}</div>
    <div><label htmlFor="filter-to">Start date through</label><input id="filter-to" type="date" max="9999-12-31" value={values.dateTo} onChange={(event) => change('dateTo', event.target.value)} aria-invalid={Boolean(errors.dateTo)} aria-describedby={errors.dateTo ? 'filter-to-error' : undefined} />{errors.dateTo && <p role="alert" id="filter-to-error">{errors.dateTo?.[0] ?? 'Enter a valid date.'}</p>}</div>
  </form>
}
