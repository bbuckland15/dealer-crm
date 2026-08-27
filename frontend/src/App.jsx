import { useEffect, useState } from 'react'
import { api } from './api'
import CustomerForm from './CustomerForm.jsx'
import CustomerDetail from './CustomerDetail.jsx'

export default function App() {
  const [customers, setCustomers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState(null)

  const refresh = () => {
    api.listCustomers().then(setCustomers).catch((e) => setError(e.message))
  }

  useEffect(refresh, [])

  const selected = customers.find((c) => c.id === selectedId) || null

  const syncInventory = async () => {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res = await api.syncInventory()
      setSyncMessage(`Synced: ${res.created} new, ${res.updated} updated, ${res.skipped} skipped (of ${res.total_found})`)
    } catch (err) {
      setSyncMessage(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="app">
      <header className="topbar">Dealership Sales CRM</header>
      <aside className="sidebar">
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ New Lead'}
          </button>
          <button onClick={syncInventory} disabled={syncing} style={{ background: '#2a6' }}>
            {syncing ? 'Syncing inventory...' : 'Sync Inventory'}
          </button>
          {syncMessage && <p style={{ fontSize: 12, color: '#666', margin: 0 }}>{syncMessage}</p>}
        </div>
        {showForm && (
          <div style={{ padding: '0 12px 12px' }}>
            <CustomerForm
              onCreated={() => {
                setShowForm(false)
                refresh()
              }}
            />
          </div>
        )}
        {error && <p style={{ color: 'red', padding: 12 }}>{error}</p>}
        {customers.map((c) => (
          <div
            key={c.id}
            className={`customer-row ${c.id === selectedId ? 'active' : ''}`}
            onClick={() => setSelectedId(c.id)}
          >
            <div className="name">{c.first_name} {c.last_name}</div>
            <div className="meta">{c.interested_vehicle || 'No vehicle set'}</div>
            <span className="status-badge">{c.status}</span>
          </div>
        ))}
        {customers.length === 0 && !showForm && (
          <p style={{ padding: 12, color: '#888' }}>No leads yet. Add one to get started.</p>
        )}
      </aside>
      <main className="main">
        {selected ? (
          <CustomerDetail
            customer={selected}
            onChanged={refresh}
            onDeleted={() => {
              setSelectedId(null)
              refresh()
            }}
          />
        ) : (
          <p style={{ color: '#888' }}>Select a customer on the left, or create a new lead.</p>
        )}
      </main>
    </div>
  )
}
