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

  // Linking to a real inventory vehicle
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [vehicleResults, setVehicleResults] = useState([])
  const [searchingVehicles, setSearchingVehicles] = useState(false)

  const loadDetails = () => {
    api.listNotes(customer.id).then(setNotes)
    api.listInteractions(customer.id).then(setInteractions)
  }

  useEffect(() => {
    loadDetails()
    setDraft(null)
    setEditingInfo(false)
    setEditingNoteId(null)
    setVehicleQuery('')
    setVehicleResults([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.id])

  // Debounced vehicle search as you type
  useEffect(() => {
    if (!vehicleQuery.trim()) {
      setVehicleResults([])
      return
    }
    setSearchingVehicles(true)
    const handle = setTimeout(() => {
      api.searchVehicles(vehicleQuery.trim())
        .then(setVehicleResults)
        .finally(() => setSearchingVehicles(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [vehicleQuery])

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

  // --- Linked vehicle ---

  const linkVehicle = async (vehicleId) => {
    await api.updateCustomer(customer.id, { vehicle_id: vehicleId })
    setVehicleQuery('')
    setVehicleResults([])
    onChanged()
  }

  const unlinkVehicle = async () => {
    await api.updateCustomer(customer.id, { vehicle_id: null })
    onChanged()
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
        <h3 style={{ marginTop: 0 }}>Linked Vehicle</h3>
        {customer.vehicle ? (
          <div style={{ display: 'flex', gap: 12 }}>
            {customer.vehicle.image_url && (
              <img
                src={customer.vehicle.image_url}
                alt=""
                style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>
                {customer.vehicle.year} {customer.vehicle.make} {customer.vehicle.model} {customer.vehicle.trim}
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                {customer.vehicle.color && <>{customer.vehicle.color} &middot; </>}
                {customer.vehicle.condition && <>{customer.vehicle.condition} &middot; </>}
                VIN {customer.vehicle.vin}
              </div>
              {customer.vehicle.price != null && (
                <div style={{ fontSize: 14, marginTop: 4 }}>${customer.vehicle.price.toLocaleString()}</div>
              )}
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                {customer.vehicle.source_url && (
                  <a href={customer.vehicle.source_url} target="_blank" rel="noreferrer">
                    <button type="button" style={{ fontSize: 12, padding: '4px 8px' }}>View listing</button>
                  </a>
                )}
                <button
                  type="button"
                  onClick={unlinkVehicle}
                  style={{ fontSize: 12, padding: '4px 8px', background: '#888' }}
                >
                  Unlink
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#666', marginTop: 0 }}>
              Search synced inventory to link this customer to a real vehicle (VIN, price, photo).
              Run "Sync Inventory" first if search comes up empty.
            </p>
            <input
              placeholder="Search by make, model, trim, or VIN..."
              value={vehicleQuery}
              onChange={(e) => setVehicleQuery(e.target.value)}
            />
            {searchingVehicles && <p style={{ fontSize: 12, color: '#888' }}>Searching...</p>}
            {vehicleResults.map((v) => (
              <div
                key={v.id}
                onClick={() => linkVehicle(v.id)}
                style={{
                  padding: '8px 10px',
                  border: '1px solid #eee',
                  borderRadius: 6,
                  marginBottom: 6,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {v.year} {v.make} {v.model} {v.trim}
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {v.color && <>{v.color} &middot; </>}
                  VIN {v.vin} {v.price != null && <>&middot; ${v.price.toLocaleString()}</>}
                </div>
              </div>
            ))}
            {vehicleQuery && !searchingVehicles && vehicleResults.length === 0 && (
              <p style={{ fontSize: 12, color: '#888' }}>No matches.</p>
            )}
          </>
        )}
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
