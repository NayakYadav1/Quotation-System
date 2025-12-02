import React from 'react'

function Navbar({ user }) {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container-fluid">
        <a className="navbar-brand" href="#">Quotation System</a>
        <div className="d-flex">
          {user ? (
            <span className="navbar-text">Signed in as {user.username} ({user.role})</span>
          ) : (
            <span className="navbar-text">Not signed in</span>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
