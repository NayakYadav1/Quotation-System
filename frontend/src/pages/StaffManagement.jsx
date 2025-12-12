import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'

function StaffManagement() {
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('staff')

  useEffect(() => {
    const fetchMeAndUsers = async () => {
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' })
        const me = await meRes.json()
        if (!me.user) {
          window.location.href = '/login'
          return
        }
        setUser(me.user)
        if (me.user.role !== 'admin') {
          setError('Only admin can manage staff')
          return
        }
        setLoading(true)
        const res = await fetch('/api/auth/users', { credentials: 'include' })
        const data = await res.json()
        if (data.error) setError(data.error)
        else setUsers(data.users || [])
      } catch (e) {
        console.error(e)
        setError('Failed to load users')
      } finally {
        setLoading(false)
      }
    }
    fetchMeAndUsers()
  }, [])

  async function createUser() {
    setError(null)
    if (!newUsername || !newPassword) return setError('username and password required')
    try {
      const res = await fetch('/api/auth/users', { method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }) })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Failed to create user')
      setUsers([...users, { username: newUsername, role: newRole }])
      setNewUsername('')
      setNewPassword('')
    } catch (e) {
      console.error(e)
      setError('Network error')
    }
  }

  async function deleteUser(u) {
    if (!confirm(`Delete user ${u}?`)) return
    try {
      const res = await fetch(`/api/auth/users/${encodeURIComponent(u)}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Failed to delete')
      setUsers(users.filter(x => x.username !== u))
    } catch (e) {
      console.error(e)
      setError('Network error')
    }
  }

  async function setPassword(u) {
    const pwd = prompt(`Set new password for ${u}`)
    if (!pwd) return
    try {
      const res = await fetch(`/api/auth/users/${encodeURIComponent(u)}/set-password`, { method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ new_password: pwd }) })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Failed to set password')
      alert('Password set')
    } catch (e) {
      console.error(e)
      setError('Network error')
    }
  }

  return (
    <div>
      <Navbar user={user} />
      <div className="container mt-4">
        <h3>Staff Management</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="card p-3 mb-3" style={{ maxWidth: 700 }}>
          <h5>Create Staff</h5>
          <div className="row g-2">
            <div className="col-md-4"><input className="form-control" placeholder="username" value={newUsername} onChange={e => setNewUsername(e.target.value)} /></div>
            <div className="col-md-4"><input className="form-control" placeholder="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
            <div className="col-md-2">
              <select className="form-select" value={newRole} onChange={e => setNewRole(e.target.value)}>
                <option value="staff">staff</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="col-md-2"><button className="btn btn-primary" onClick={createUser}>Create</button></div>
          </div>
        </div>

        <div className="card p-3" style={{ maxWidth: 700 }}>
          <h5>Staff List</h5>
          {loading ? <p>Loading...</p> : (
            <table className="table">
              <thead><tr><th>Username</th><th>Role</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.username}>
                    <td>{u.username}</td>
                    <td>{u.role}</td>
                    <td>
                      <button className="btn btn-sm btn-secondary me-2" onClick={() => setPassword(u.username)}>Set Password</button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.username)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default StaffManagement
