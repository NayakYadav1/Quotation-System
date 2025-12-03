import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

function CreateQuotation() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [step, setStep] = useState(1) // 1=info, 2=parts, 3=finalize
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Step 1: Customer info
  const [customer, setCustomer] = useState('')
  const [address, setAddress] = useState('')
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0])

  // Step 2: Parts selection
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  // engineLevels: array where each element is an array of nodes for that level
  const [engineLevels, setEngineLevels] = useState([])
  // selectedEngineIds: array of selected node id per level
  const [selectedEngineIds, setSelectedEngineIds] = useState([])
  const [availableParts, setAvailableParts] = useState([])
  const [selectedParts, setSelectedParts] = useState([])

  // Step 3: Finalize
  const [labour, setLabour] = useState(0)
  const [discount, setDiscount] = useState(0)

  // Fetch user and categories on mount
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' })
        const meData = await meRes.json()
        if (!meData.user) {
          navigate('/login')
          return
        }
        setUser(meData.user)

        // Fetch categories
        const catRes = await fetch('/api/quotations/categories', { credentials: 'include' })
        const catData = await catRes.json()
        setCategories(catData.categories || [])
      } catch (e) {
        console.error(e)
        setError('Failed to load data')
      }
    }
    fetchInitial()
  }, [navigate])

  // Fetch engine tree when category changes (top-level roots)
  useEffect(() => {
    if (!selectedCategory) {
      setEngineLevels([])
      setSelectedEngineIds([])
      setAvailableParts([])
      return
    }

    const fetchTree = async () => {
      try {
        const res = await fetch(`/api/quotations/tree/${encodeURIComponent(selectedCategory)}`, { credentials: 'include' })
        const data = await res.json()
        const tree = data.tree || []
        // initialize levels with root nodes
        setEngineLevels([tree])
        setSelectedEngineIds([null])
        setAvailableParts([])
      } catch (e) {
        console.error(e)
        setEngineLevels([])
        setSelectedEngineIds([])
        setAvailableParts([])
      }
    }

    fetchTree()
  }, [selectedCategory])

  // Handler when user picks an engine node at a given level
  async function handleEngineSelect(levelIndex, nodeId) {
    // update selected ids
    const newSelected = selectedEngineIds.slice(0, levelIndex)
    newSelected[levelIndex] = nodeId
    setSelectedEngineIds(newSelected)

    // find the node object in engineLevels[levelIndex]
    const node = (engineLevels[levelIndex] || []).find(n => n.id === parseInt(nodeId))
    if (!node) {
      // clear deeper levels and parts
      setEngineLevels(engineLevels.slice(0, levelIndex + 1))
      setAvailableParts([])
      return
    }

    if (node.children && node.children.length > 0) {
      // set next level to node.children and clear any deeper levels
      const newLevels = engineLevels.slice(0, levelIndex + 1)
      newLevels[levelIndex + 1] = node.children
      setEngineLevels(newLevels)
      // clear parts until a leaf is chosen
      setAvailableParts([])
      // ensure selected ids array has a slot for next level
      const sel = newSelected.slice(0, levelIndex + 1)
      sel[levelIndex + 1] = null
      setSelectedEngineIds(sel)
    } else {
      // leaf node: fetch parts for this engine id
      try {
        const res = await fetch(`/api/quotations/parts/${node.id}`, { credentials: 'include' })
        const data = await res.json()
        setAvailableParts(data.parts || [])
        // trim levels to this level
        setEngineLevels(engineLevels.slice(0, levelIndex + 1))
      } catch (e) {
        console.error(e)
        setAvailableParts([])
      }
    }
  }

  // Add part to quote
  function addPart(part) {
    const existing = selectedParts.find(p => p.part_id === part.id)
    if (existing) {
      existing.qty += 1
    } else {
      selectedParts.push({ part_id: part.id, part_no: part.part_no, part_name: part.part_name, qty: 1, price: part.price })
    }
    setSelectedParts([...selectedParts])
  }

  // Remove part from quote
  function removePart(partId) {
    setSelectedParts(selectedParts.filter(p => p.part_id !== partId))
  }

  // Update part qty or price
  function updatePart(partId, field, value) {
    const part = selectedParts.find(p => p.part_id === partId)
    if (part) {
      part[field] = parseFloat(value) || 0
      setSelectedParts([...selectedParts])
    }
  }

  // Calculate totals
  const subtotal = selectedParts.reduce((sum, p) => sum + (p.qty * p.price), 0)
  const total = (subtotal + parseFloat(labour)) * (1 - parseFloat(discount) / 100)

  // Next/Back
  function handleNext() {
    if (step === 1 && (!customer || !address)) {
      setError('Customer name and address required')
      return
    }
    if (step === 2 && selectedParts.length === 0) {
      setError('Add at least one part')
      return
    }
    setError(null)
    setStep(step + 1)
  }

  function handleBack() {
    setError(null)
    setStep(step - 1)
  }

  // Submit quotation
  async function handleSubmit() {
    setLoading(true)
    try {
      const res = await fetch('/api/quotations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer,
          address,
          items: selectedParts,
          labour: parseFloat(labour),
          discount_percent: parseFloat(discount)
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create quotation')
        return
      }
      // Navigate to view quotations
      navigate('/quotations')
    } catch (e) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Navbar user={user} />
      <div className="container mt-4">
        <h2>Create Quotation - Step {step}</h2>
        {error && <div className="alert alert-danger">{error}</div>}

        {step === 1 && (
          <div className="card p-4" style={{ maxWidth: '600px' }}>
            <h4>Customer Information</h4>
            <div className="mb-3">
              <label className="form-label">Customer Name</label>
              <input type="text" className="form-control" value={customer} onChange={e => setCustomer(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label">Address</label>
              <textarea className="form-control" value={address} onChange={e => setAddress(e.target.value)} rows="3"></textarea>
            </div>
            <div className="mb-3">
              <label className="form-label">Quote Date</label>
              <input type="text" className="form-control" value={quoteDate} disabled />
            </div>
            <button className="btn btn-primary" onClick={handleNext}>Next</button>
          </div>
        )}

        {step === 2 && (
          <div className="card p-4">
            <h4>Select Parts</h4>
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Category</label>
                <select className="form-select" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                  <option value="">-- Select Category --</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Model / Product Line</label>
                {engineLevels.length === 0 ? (
                  <select className="form-select" disabled>
                    <option>-- Select Category first --</option>
                  </select>
                ) : (
                  engineLevels.map((options, levelIdx) => (
                    <select key={levelIdx} className="form-select mb-2" value={selectedEngineIds[levelIdx] || ''} onChange={e => handleEngineSelect(levelIdx, e.target.value)}>
                      <option value="">-- Select --</option>
                      {options.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  ))
                )}
              </div>
            </div>

            <div className="mb-3">
              <h5>Available Parts</h5>
              {availableParts.length === 0 ? (
                <p className="text-muted">Select a leaf model to see parts</p>
              ) : (
                <table className="table table-sm table-striped">
                  <thead>
                    <tr>
                      <th>Part No</th>
                      <th>Part Name</th>
                      <th>Price</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableParts.map(part => (
                      <tr key={part.id}>
                        <td>{part.part_no}</td>
                        <td>{part.part_name}</td>
                        <td>₹{part.price.toFixed(2)}</td>
                        <td>
                          <button className="btn btn-sm btn-success" onClick={() => addPart(part)}>Add</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mb-3">
              <h5>Selected Parts</h5>
              {selectedParts.length === 0 ? (
                <p className="text-muted">No parts selected</p>
              ) : (
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>Part No</th>
                      <th>Part Name</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedParts.map((part, idx) => (
                      <tr key={idx}>
                        <td>{part.part_no}</td>
                        <td>{part.part_name}</td>
                        <td>
                          <input type="number" style={{ width: '60px' }} value={part.qty} onChange={e => updatePart(part.part_id, 'qty', e.target.value)} />
                        </td>
                        <td>
                          <input type="number" style={{ width: '80px' }} value={part.price.toFixed(2)} onChange={e => updatePart(part.part_id, 'price', e.target.value)} />
                        </td>
                        <td>₹{(part.qty * part.price).toFixed(2)}</td>
                        <td>
                          <button className="btn btn-sm btn-danger" onClick={() => removePart(part.part_id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn btn-primary" onClick={handleNext}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card p-4" style={{ maxWidth: '600px' }}>
            <h4>Finalize Quote</h4>
            <table className="table">
              <tbody>
                <tr>
                  <td><strong>Subtotal:</strong></td>
                  <td>₹{subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td><strong>Labour Charge:</strong></td>
                  <td>
                    <input type="number" style={{ width: '100px' }} value={labour} onChange={e => setLabour(e.target.value)} /> ₹
                  </td>
                </tr>
                <tr>
                  <td><strong>Discount (%):</strong></td>
                  <td>
                    <input type="number" style={{ width: '100px' }} value={discount} onChange={e => setDiscount(e.target.value)} min="0" max="100" /> %
                  </td>
                </tr>
                <tr>
                  <td><strong>Total:</strong></td>
                  <td>₹{total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div className="d-flex gap-2">
              <button className="btn btn-secondary" onClick={handleBack} disabled={loading}>Back</button>
              <button className="btn btn-success" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creating...' : 'Create Quotation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateQuotation
