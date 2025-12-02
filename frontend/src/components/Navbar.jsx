import React from 'react'
import { useNavigate } from 'react-router-dom'

function Navbar({ user }) {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      navigate('/login')
    } catch (e) {
      console.error('Logout failed:', e)
    }
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container-fluid">
        <a className="navbar-brand" href="#">Quotation System</a>
        <div className="d-flex align-items-center gap-3">
          {user ? (
            <>
              <span className="navbar-text">Signed in as {user.username} ({user.role})</span>
              <button className="btn btn-sm btn-danger" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <span className="navbar-text">Not signed in</span>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
