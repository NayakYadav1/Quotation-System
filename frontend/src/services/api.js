// Simple fetch wrapper (currently not used heavily)
export async function login(username, password) {
  const res = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include'
  })
  return res.json()
}

export async function me() {
  const res = await fetch('http://127.0.0.1:5000/api/auth/me', { credentials: 'include' })
  return res.json()
}
