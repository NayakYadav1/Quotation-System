import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import numberToWords from '../services/numToWords'

function ViewQuotations() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [quotations, setQuotations] = useState([])
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch user and quotations on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const meRes = await fetch('/api/auth/me', { credentials: 'include' })
        const meData = await meRes.json()
        if (!meData.user) {
          navigate('/login')
          return
        }
        setUser(meData.user)

        // Fetch quotations
        const quotRes = await fetch('/api/quotations', { credentials: 'include' })
        const quotData = await quotRes.json()
        setQuotations(quotData.quotations || [])
      } catch (e) {
        console.error(e)
        setError('Failed to load quotations')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [navigate])

  // Fetch quotation detail
  async function fetchDetail(id) {
    try {
      const res = await fetch(`/api/quotations/${id}`, { credentials: 'include' })
      const data = await res.json()
      setSelectedQuote(data)
    } catch (e) {
      console.error(e)
      setError('Failed to load quotation detail')
    }
  }

  return (
    <div>
      <Navbar user={user} />
      <div className="container mt-4">
        <h2>Quotations</h2>
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="row">
          <div className="col-md-6">
            <h4>All Quotations</h4>
            {loading ? (
              <p>Loading...</p>
            ) : quotations.length === 0 ? (
              <p className="text-muted">No quotations found</p>
            ) : (
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Quote No</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map(quote => (
                    <tr key={quote.id} onClick={() => fetchDetail(quote.id)} style={{ cursor: 'pointer' }}>
                      <td>{quote.quote_no}</td>
                      <td>{quote.customer}</td>
                      <td>{quote.date}</td>
                      <td>₹{quote.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="col-md-6">
            <h4>Details</h4>
            {selectedQuote ? (
              <div className="card p-3">
                <p><strong>Quote No:</strong> {selectedQuote.quote_no}</p>
                <p><strong>Customer:</strong> {selectedQuote.customer}</p>
                <p><strong>Address:</strong> {selectedQuote.address}</p>
                <p><strong>Date:</strong> {selectedQuote.date}</p>
                <p><strong>Created by:</strong> {selectedQuote.created_by}</p>

                <h5>Items</h5>
                {selectedQuote.items && selectedQuote.items.length > 0 ? (
                  <table className="table table-sm table-bordered">
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuote.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <div>{item.part_name || item.part_no || `#${item.part_id}`}</div>
                            <div className="text-muted" style={{ fontSize: '0.9em' }}>{item.part_no ? item.part_no : ''}</div>
                          </td>
                          <td>{item.qty}</td>
                          <td>₹{item.price.toFixed(2)}</td>
                          <td>₹{(item.qty * item.price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted">No items</p>
                )}

                <table className="table table-sm">
                  <tbody>
                    {/** compute subtotal, vat, discount and total on the frontend for display */}
                    {(() => {
                      const items = selectedQuote.items || []
                      const subtotal = items.reduce((s, it) => s + (it.qty * it.price), 0)
                      const discount_percent = parseFloat(selectedQuote.discount_percent || 0)
                      const discount_amount = subtotal * (discount_percent / 100)
                      const discounted_subtotal = subtotal - discount_amount
                      const vat = discounted_subtotal * 0.13
                      const total = discounted_subtotal + vat
                      return (
                        <>
                          <tr>
                            <td><strong>Subtotal:</strong></td>
                            <td>₹{subtotal.toFixed(2)}</td>
                          </tr>
                          {discount_percent > 0 && (
                            <tr>
                              <td><strong>Discount (%):</strong></td>
                              <td>{discount_percent}% (₹{discount_amount.toFixed(2)})</td>
                            </tr>
                          )}
                          <tr>
                            <td><strong>VAT (13%):</strong></td>
                            <td>₹{vat.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td><strong>Total:</strong></td>
                            <td><strong>₹{total.toFixed(2)}</strong></td>
                          </tr>
                          <tr>
                            <td colSpan="2"><em>{numberToWords(total)}</em></td>
                          </tr>
                        </>
                      )
                    })()}
                  </tbody>
                </table>

                <button className="btn btn-primary">Print/Download PDF</button>
              </div>
            ) : (
              <p className="text-muted">Select a quotation to view details</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewQuotations
