import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

function Dashboard() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        const data = await res.json()
        if (!data.user) {
          // No valid session, redirect to login
          navigate('/login')
          return
        }
        setUser(data.user)
      } catch (e) {
        console.error(e)
        navigate('/login')
      }
    }
    fetchMe()
  }, [navigate])

  return (
    <div>
      <Navbar user={user} />
      <div className="container mt-4">
        <h2>Dashboard</h2>
        <p>Welcome {user ? user.username : 'Guest'}</p>

        <div className="btn-group" role="group" aria-label="dashboard-actions">
          <button className="btn btn-success">Create New Quotation</button>
          <button className="btn btn-secondary">View Quotations</button>
          {user && user.role === 'admin' && (
            <button className="btn btn-warning">Upload Database (admin)</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
