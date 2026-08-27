const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  listCustomers: () => request('/customers/'),
  createCustomer: (data) => request('/customers/', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => request(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

  listNotes: (id) => request(`/customers/${id}/notes`),
  addNote: (id, body) => request(`/customers/${id}/notes`, { method: 'POST', body: JSON.stringify({ body }) }),

  listInteractions: (id) => request(`/customers/${id}/interactions`),

  draftOutreach: (id) => request(`/outreach/${id}/draft`, { method: 'POST' }),
}
