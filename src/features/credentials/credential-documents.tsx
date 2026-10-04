import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useAuth } from '../auth/contexts/auth.context'
import { apiRequest } from '../../shared/api/client'
import styles from './credential-documents.module.scss'
const documentSchema = z.object({ id: z.string().uuid(), nurseId: z.string().uuid().optional(), kind: z.enum(['nurse_license', 'tb_test']), filename: z.string(), expiresOn: z.string(), size: z.number(), nurseName: z.string().optional() })
const listSchema = z.object({ documents: z.array(documentSchema), selfReportedExpiry: z.string().nullable(), autoApprovalEnabled: z.boolean().default(false) })
const labels = { nurse_license: 'Nurse license', tb_test: 'TB test result' }
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
export function CredentialDocuments() {
  const { session } = useAuth()
  const client = useQueryClient()
  const token = session?.token
  const admin = session?.user.role === 'admin'
  const key = ['credentials', session?.user.id]
  const [selectedNurses, setSelectedNurses] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const query = useQuery({ queryKey: key, queryFn: async () => listSchema.parse(await apiRequest('credentials/', { token })), enabled: !!token })
  async function refreshEligibility() { await Promise.all([client.invalidateQueries({ queryKey: key }), client.invalidateQueries({ queryKey: ['shifts'], refetchType: 'all' })]) }
  const upload = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const kind = (form.elements.namedItem('kind') as HTMLSelectElement).value
      const expiresOn = (form.elements.namedItem('expiresOn') as HTMLInputElement).value
      const file = (form.elements.namedItem('document') as HTMLInputElement).files?.[0]
      if (!file || !file.size || file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) throw new Error('Choose a PDF, JPEG or PNG up to 5 MiB.')
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Could not read file.')); reader.readAsDataURL(file) })
      await apiRequest('credentials/', { token, method: 'POST', body: JSON.stringify({ kind, expiresOn, filename: file.name, mimeType: file.type, data }) })
      form.reset()
    },
    onError: (_error, form) => { (form.elements.namedItem('document') as HTMLInputElement).value = '' },
    onSuccess: async () => { await refreshEligibility(); setMessage('Document uploaded.') },
  })
  const update = useMutation({ mutationFn: ({ id, expiresOn }: { id: string; expiresOn: string }) => apiRequest(`credentials/${id}`, { token, method: 'PATCH', body: JSON.stringify({ expiresOn }) }), onSuccess: async () => { await refreshEligibility(); setMessage('Expiry date saved.') } })
  async function download(id: string, filename: string) {
    setDownloading(id); clearFeedback()
    try {
      const response = await fetch(`${baseUrl}/credentials/${id}/download`, { headers: { Authorization: `Bearer ${token}`, 'X-Shiftpatch-Request': '1' }, credentials: 'include' })
      if (!response.ok) throw new Error('Could not download document.')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a'); link.href = url; link.download = filename; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) { setDownloadError(error instanceof Error ? error.message : 'Download failed.') } finally { setDownloading(null) }
  }
  const exportDocuments = useMutation({ mutationFn: async () => {
    const response = await fetch(`${baseUrl}/credentials/export`, { method: 'POST', credentials: 'include', headers: { Authorization: `Bearer ${token}`, 'X-Shiftpatch-Request': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ nurseIds: selectedNurses }) })
    if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error || 'Could not export documents.') }
    const url = URL.createObjectURL(await response.blob())
    const link = document.createElement('a'); link.href = url; link.download = 'credential-documents.zip'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, onSuccess: () => setMessage('Archive downloaded. Review manifest.json for scope, versions and expiry dates.') })
  function clearFeedback() { setMessage(''); setDownloadError(''); upload.reset(); update.reset() }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); clearFeedback(); upload.mutate(event.currentTarget) }
  return <section className={styles.section} aria-labelledby="credentials-title">
    <h2 id="credentials-title">Credential documents</h2>
    <p>Private nurse license documents and TB test results. Dates are self-reported.</p>
    {query.data?.autoApprovalEnabled ? <p className={styles.demoNotice}>Demo auto-approval enabled. License uploads and edits to the latest license update the expiry date used for shift claims. TB uploads are optional and do not affect claims. This is not professional verification.</p> : <p>Shift eligibility uses your nurse profile expiry date only. Uploads are optional and do not professionally verify credentials.</p>}
    {!admin && <>
      {query.data && <p>{query.data.autoApprovalEnabled ? 'Credential expiry used for shift claims' : 'Existing self-reported credential expiry'}: {query.data.selfReportedExpiry}.{!query.data.autoApprovalEnabled && ' Document dates are tracked separately.'}</p>}
      <form onSubmit={submit} onChange={event => { if (!(event.target instanceof HTMLInputElement && event.target.type === 'file')) clearFeedback() }} className={styles.form}>
        <label>Document type<span className={styles.selectControl}><select name="kind" disabled={upload.isPending}><option value="nurse_license">Nurse license</option><option value="tb_test">TB test result</option></select></span></label>
        <label>Document expiry date<input type="date" name="expiresOn" disabled={upload.isPending} required min="0001-01-01" max="9999-12-31" /></label>
        <label className={styles.fileField}>Document file<input type="file" name="document" disabled={upload.isPending} accept=".pdf,.jpg,.jpeg,.png" aria-describedby="credential-file-help" onClick={event => {
          if (!event.currentTarget.form?.reportValidity()) event.preventDefault()
        }} onChange={event => {
          if (event.currentTarget.files?.length) event.currentTarget.form?.requestSubmit()
        }} /></label>
        <p id="credential-file-help" className={styles.help}>Set the type and expiry date, then choose a file to upload. PDF, JPEG or PNG; maximum 5 MiB. Only you and administrators can access these files.</p>
        {upload.isPending && <p role="status">Uploading…</p>}
      </form>
    </>}
    {message && <p role="status">{message}</p>}
    {(upload.isError || update.isError || downloadError) && <p role="alert">{downloadError || (upload.error || update.error)?.message}</p>}
    {query.isPending ? <p role="status">Loading documents…</p> : query.isError ? <p role="alert">Could not load documents.</p> : <>
      {!query.data.documents.length && <p>No credential documents uploaded yet.</p>}
      {admin && <>
        <div className={styles.exportToolbar}>
          <p>Select up to 10 nurses, then download their documents together.</p>
          <button disabled={!selectedNurses.length || exportDocuments.isPending} onClick={() => { setMessage(''); exportDocuments.mutate() }}>{exportDocuments.isPending ? 'Preparing ZIP…' : `Download selected ZIP (${selectedNurses.length})`}</button>
        </div>
        <p className={styles.help}>The ZIP includes all stored versions, expired documents and a manifest. Both a license and TB record are required per nurse. Missing files block the download. Limit: 100 files / 25 MiB. Demo files may disappear on restart.</p>
        {exportDocuments.isPending && <p role="status">Preparing document archive…</p>}
        {exportDocuments.isError && <p role="alert">{exportDocuments.error.message}</p>}
        {!!query.data.documents.length && <div className={styles.tableScroll}><table className={styles.nurseTable}>
          <caption className={styles.tableCaption}>Nurse documents — select rows for a batch ZIP or download individual files below.</caption>
          <thead><tr><th scope="col">Select</th><th scope="col">Nurse</th><th scope="col">License documents</th><th scope="col">TB test results</th></tr></thead>
          <tbody>{Array.from(new Set(query.data.documents.map(doc => doc.nurseId || doc.id))).map(id => {
            const documents = query.data.documents.filter(doc => (doc.nurseId || doc.id) === id)
            const name = documents[0].nurseName || id
            const nurseId = documents[0].nurseId
            return <tr key={id}>
              <td><input className={styles.rowCheckbox} type="checkbox" aria-label={`Select ${name}`} checked={!!nurseId && selectedNurses.includes(nurseId)} disabled={!nurseId || exportDocuments.isPending || (!selectedNurses.includes(nurseId) && selectedNurses.length >= 10)} onChange={event => { exportDocuments.reset(); setMessage(''); setSelectedNurses(current => event.target.checked ? [...current, nurseId!] : current.filter(value => value !== nurseId)) }} /></td>
              <th scope="row">{name}</th>
              {(['nurse_license', 'tb_test'] as const).map(kind => <td key={kind}>
                {documents.some(doc => doc.kind === kind) ? <ul className={styles.documentLinks}>{documents.filter(doc => doc.kind === kind).map(doc => <li key={doc.id}>
                  <button className={styles.fileDownload} disabled={downloading !== null} aria-label={`Download ${doc.filename} for ${name}`} onClick={() => void download(doc.id, doc.filename)}>{downloading === doc.id ? 'Downloading…' : doc.filename}</button>
                  <span>Expires {doc.expiresOn} · {Math.ceil(doc.size / 1024)} KiB</span>
                </li>)}</ul> : <span className={styles.missingDocument}>Not uploaded</span>}
              </td>)}
            </tr>
          })}</tbody>
        </table></div>}
      </>}
      {!admin && <ul className={styles.list}>{query.data.documents.map(doc => <li key={doc.id}>
        <h3>{labels[doc.kind]}{doc.nurseName ? ` — ${doc.nurseName}` : ''}</h3>
        <p>{doc.filename} · {Math.ceil(doc.size / 1024)} KiB · Expires {doc.expiresOn}</p>
        <button disabled={downloading !== null} onClick={() => void download(doc.id, doc.filename)}>{downloading === doc.id ? 'Downloading…' : 'Download'}</button>
        {!admin && <form className={styles.expiryForm} onChange={clearFeedback} onSubmit={event => { event.preventDefault(); clearFeedback(); update.mutate({ id: doc.id, expiresOn: String(new FormData(event.currentTarget).get('expiresOn')) }) }}>
          <label>Expiry date for {doc.filename}<input type="date" name="expiresOn" defaultValue={doc.expiresOn} required min="0001-01-01" max="9999-12-31" /></label><button disabled={update.isPending}>Save expiry</button>
        </form>}
      </li>)}</ul>}
    </>}
  </section>
}
