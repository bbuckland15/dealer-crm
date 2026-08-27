import { useState } from 'react'
import { api } from './api'

export default function CustomerForm({ onCreated }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', interested_vehicle: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.first_name || !form.last_name) {
      setError('First and last name are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.createCustomer(form)
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <input placeholder="First name" value={form.first_name} onChange={update('first_name')} />
      <input placeholder="Last name" value={form.last_name} onChange={update('last_name')} />
      <input placeholder="Email" value={form.email} onChange={update('email')} />
      <input placeholder="Phone" value={form.phone} onChange={update('phone')} />
      <input placeholder="Interested vehicle (e.g. 2024 Tiguan)" value={form.interested_vehicle} onChange={update('interested_vehicle')} />
      {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
      <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Lead'}</button>
    </form>
  )
}
