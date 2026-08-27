import { useEffect, useState } from 'react'
import { api } from './api'

const STATUSES = ['new', 'contacted', 'interested', 'negotiating', 'sold', 'lost']

export default function CustomerDetail({ customer, onChanged }) {
  const [notes, setNotes] = useState([])
  const [interactions, setInteractions] = useState([])
  const [newNote, setNewNote] = useState('')
  const [draft, setDraft] = useState(null)
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState(null)

  const loadDetails = () => {
    api.listNotes(customer.id).then(setNotes)
    api.listInteractions(customer.id).then(setInteractions)
  }

  useEffect(loadDetails, [customer.id])

  const addNote = async (e) => {
    e.preventDefault()
    if (!newNote.trim()) return
    await api.addNote(customer.id, newNote.trim())
    setNewNote('')
    loadDetails()
  }

  const changeStatus = async (e) => {
    await api.updateCustomer(customer.id, { status: e.target.value })
    onChanged()
  }

  const generateOutreach = async () => {
    setDrafting(true)
    setDraftError(null)
    setDraft(null)
    try {
      const res = await api.draftOutreach(customer.id)
      setDraft(res.draft_message)
      loadDetails()
    } catch (err) {
      setDraftError(err.message)
    } finally {
      setDrafting(false)
    }
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{customer.first_name} {customer.last_name}</h2>
        <p>{customer.email || 'no email'} &middot; {customer.phone || 'no phone'}</p>
        <p>Interested in: <strong>{customer.interested_vehicle || 'unspecified'}</strong></p>
        <label>Status</label>
        <select value={customer.status} onChange={changeStatus}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>AI Outreach</h3>
        <p style={{ fontSize: 13, color: '#666' }}>
          Generates a draft follow-up message based on this customer's notes. You review and
          send it yourself &mdash; nothing is sent automatically.
        </p>
        <button onClick={generateOutreach} disabled={drafting}>
          {drafting ? 'Drafting...' : 'Draft follow-up message'}
        </button>
        {draftError && <p style={{ color: 'red', fontSize: 13 }}>{draftError}</p>}
        {draft && (
          <div style={{ marginTop: 12, padding: 12, background: '#f4f6fb', borderRadius: 6 }}>
            {draft}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Notes</h3>
        <form onSubmit={addNote} className="form-row" style={{ marginBottom: 12 }}>
          <input placeholder="Add a note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
          <button type="submit" style={{ width: 100 }}>Add</button>
        </form>
        {notes.map((n) => (
          <div key={n.id} className="note-item">
            <div>{n.body}</div>
            <div className="ts">{new Date(n.created_at).toLocaleString()}</div>
          </div>
        ))}
        {notes.length === 0 && <p style={{ color: '#888' }}>No notes yet.</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Interaction History</h3>
        {interactions.map((i) => (
          <div key={i.id} className="interaction-item">
            <strong>{i.type}</strong>: {i.summary}
            <div className="ts">{new Date(i.created_at).toLocaleString()}</div>
          </div>
        ))}
        {interactions.length === 0 && <p style={{ color: '#888' }}>No interactions logged yet.</p>}
      </div>
    </div>
  )
}
