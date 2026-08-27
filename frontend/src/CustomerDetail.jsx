import { useEffect, useState } from 'react'
import { api } from './api'

const STATUSES = ['new', 'contacted', 'interested', 'negotiating', 'sold', 'lost']

export default function CustomerDetail({ customer, onChanged, onDeleted }) {
  const [notes, setNotes] = useState([])
  const [interactions, setInteractions] = useState([])
  const [newNote, setNewNote] = useState('')
  const [draft, setDraft] = useState(null)
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState(null)

  // Editing customer info
  const [editingInfo, setEditingInfo] = useState(false)
  const [infoForm, setInfoForm] = useState({})
  const [savingInfo, setSavingInfo] = useState(false)

  // Editing an individual note
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingNoteBody, setEditingNoteBody] = useState('')

  const loadDetails = () => {
    api.listNotes(customer.id).then(setNotes)
    api.listInteractions(customer.id).then(setInteractions)
  }

  useEffect(() => {
    loadDetails()
    setDraft(null)
    setEditingInfo(false)
    setEditingNoteId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.id])

  // --- Customer info editing ---

  const startEditingInfo = () => {
    setInfoForm({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email || '',
      phone: customer.phone || '',
      interested_vehicle: customer.interested_vehicle || '',
    })
    setEditingInfo(true)
  }

  const saveInfo = async (e) => {
    e.preventDefault()
    setSavingInfo(true)
    try {
      await api.updateCustomer(customer.id, infoForm)
      setEditingInfo(false)
      onChanged()
    } finally {
      setSavingInfo(false)
    }
  }

  const changeStatus = async (e) => {
    await api.updateCustomer(customer.id, { status: e.target.value })
    onChanged()
  }

  const deleteCustomer = async () => {
    if (!confirm(`Delete ${customer.first_name} ${customer.last_name}? This can't be undone.`)) return
    await api.deleteCustomer(customer.id)
    onDeleted()
  }

  // --- Notes ---

  const addNote = async (e) => {
    e.preventDefault()
    if (!newNote.trim()) return
    await api.addNote(customer.id, newNote.trim())
    setNewNote('')
    loadDetails()
  }

  const startEditingNote = (note) => {
    setEditingNoteId(note.id)
    setEditingNoteBody(note.body)
  }

  const saveNote = async (noteId) => {
    if (!editingNoteBody.trim()) return
    await api.updateNote(customer.id, noteId, editingNoteBody.trim())
    setEditingNoteId(null)
    loadDetails()
  }

  const deleteNote = async (noteId) => {
    if (!confirm('Delete this note?')) return
    await api.deleteNote(customer.id, noteId)
    loadDetails()
  }

  // --- AI outreach ---

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h2 style={{ marginTop: 0 }}>{customer.first_name} {customer.last_name}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {!editingInfo && <button onClick={startEditingInfo}>Edit</button>}
            <button onClick={deleteCustomer} style={{ background: '#a33' }}>Delete</button>
          </div>
        </div>

        {editingInfo ? (
          <form onSubmit={saveInfo}>
            <label>First name</label>
            <input
              value={infoForm.first_name}
              onChange={(e) => setInfoForm({ ...infoForm, first_name: e.target.value })}
            />
            <label>Last name</label>
            <input
              value={infoForm.last_name}
              onChange={(e) => setInfoForm({ ...infoForm, last_name: e.target.value })}
            />
            <label>Email</label>
            <input
              value={infoForm.email}
              onChange={(e) => setInfoForm({ ...infoForm, email: e.target.value })}
            />
            <label>Phone</label>
            <input
              value={infoForm.phone}
              onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
            />
            <label>Interested vehicle</label>
            <input
              value={infoForm.interested_vehicle}
              onChange={(e) => setInfoForm({ ...infoForm, interested_vehicle: e.target.value })}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={savingInfo}>{savingInfo ? 'Saving...' : 'Save'}</button>
              <button type="button" onClick={() => setEditingInfo(false)} style={{ background: '#888' }}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <p>{customer.email || 'no email'} &middot; {customer.phone || 'no phone'}</p>
            <p>Interested in: <strong>{customer.interested_vehicle || 'unspecified'}</strong></p>
          </>
        )}

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
            {editingNoteId === n.id ? (
              <div className="form-row">
                <input value={editingNoteBody} onChange={(e) => setEditingNoteBody(e.target.value)} />
                <button onClick={() => saveNote(n.id)} style={{ width: 80 }}>Save</button>
                <button onClick={() => setEditingNoteId(null)} style={{ width: 80, background: '#888' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div>{n.body}</div>
                  <div className="ts">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                  <button onClick={() => startEditingNote(n)} style={{ fontSize: 12, padding: '4px 8px' }}>
                    Edit
                  </button>
                  <button
                    onClick={() => deleteNote(n.id)}
                    style={{ fontSize: 12, padding: '4px 8px', background: '#a33' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
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
