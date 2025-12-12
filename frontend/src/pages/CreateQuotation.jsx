import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import numberToWords from '../services/numToWords'

function CreateQuotation() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [step, setStep] = useState(1) // 1=info, 2=parts, 3=finalize
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const location = useLocation()
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
  // Custom part fields
  const [customPartNo, setCustomPartNo] = useState('')
  const [customPartName, setCustomPartName] = useState('')
  const [customPrice, setCustomPrice] = useState(0)
  const [customQty, setCustomQty] = useState(1)
  const [customMatched, setCustomMatched] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  // Other charges fields
  const [chargeDescription, setChargeDescription] = useState('')
  const [chargeAmount, setChargeAmount] = useState(0)
  const [chargeQty, setChargeQty] = useState(1)
  const partSearchTimer = useRef(null)

  // Sync step from URL query param (handles browser back button)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const urlStep = parseInt(params.get('step') || '1', 10)
    if (urlStep && urlStep !== step) {
      setStep(urlStep)
    }
  }, [location.search, step])

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
        // Restore draft from sessionStorage if available
      } catch (e) {
        console.error(e)
        setError('Failed to load data')
      }
    }
    fetchInitial()
  }, [navigate, location])

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
    const uid = `p-${part.id}`
    const existing = selectedParts.find(p => p.uid === uid)
    if (existing) {
      existing.qty += 1
    } else {
      selectedParts.push({ uid, part_id: part.id, part_no: part.part_no, part_name: part.part_name, qty: 1, price: part.price })
    }
    setSelectedParts([...selectedParts])
  }

  // Remove part from quote
  function removePart(uid) {
    setSelectedParts(selectedParts.filter(p => p.uid !== uid))
  }

  // Update part qty or price
  function updatePart(uid, field, value) {
    const part = selectedParts.find(p => p.uid === uid)
    if (part) {
      if (field === 'qty') {
        let v = parseFloat(value)
        if (isNaN(v) || v < 1) v = 1
        part.qty = v
      } else if (field === 'price') {
        let v = parseFloat(value)
        if (isNaN(v) || v < 0) v = 0
        part.price = v
      } else {
        part[field] = value
      }
      setSelectedParts([...selectedParts])
    }
  }

  // Calculate totals
  const subtotal = selectedParts.reduce((sum, p) => sum + (p.qty * p.price), 0)
  const discount_percent = parseFloat(discount) || 0
  const discount_amount = subtotal * (discount_percent / 100)
  const discounted_subtotal = subtotal - discount_amount
  const vat = discounted_subtotal * 0.13
  const total = discounted_subtotal + vat

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
    const newStep = step + 1
    setStep(newStep)
    try {
      navigate(`${location.pathname}?step=${newStep}`)
    } catch (e) {
      // fallback: do nothing
    }
  }

  function handleBack() {
    setError(null)
    const newStep = Math.max(1, step - 1)
    setStep(newStep)
    try {
      navigate(`${location.pathname}?step=${newStep}`)
    } catch (e) {
      // fallback
    }
  }

  // Submit quotation
  async function handleSubmit() {
    setLoading(true)
    try {
      // Prepare items for backend: ensure custom parts have null part_id
      const itemsPayload = selectedParts.map(p => ({
        part_id: (p.part_id == null ? null : p.part_id),
        part_no: p.part_no,
        part_name: p.part_name,
        qty: parseFloat(p.qty) || 0,
        price: parseFloat(p.price) || 0
      }))

      const res = await fetch('/api/quotations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer,
          address,
          date: quoteDate,
          items: itemsPayload,
          discount_percent: parseFloat(discount)
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create quotation')
        return
      }
      // Clear draft and navigate to view quotations
      try {
        sessionStorage.removeItem('createQuotationDraft')
      } catch (e) {
        // ignore
      }
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
              <input type="date" className="form-control" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} />
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
                      <th>S.No</th>
                      <th>Part No</th>
                      <th>Description</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedParts.map((part, idx) => (
                      <tr key={part.uid || idx}>
                        <td>{idx + 1}</td>
                        <td>{part.part_no}</td>
                        <td>{part.part_name}</td>
                        <td>
                          <input type="number" min="1" style={{ width: '60px' }} value={part.qty} onChange={e => updatePart(part.uid, 'qty', e.target.value)} />
                        </td>
                        <td>
                          <input type="number" min="0" step="0.01" style={{ width: '80px' }} value={(part.price || 0).toFixed(2)} onChange={e => updatePart(part.uid, 'price', e.target.value)} />
                        </td>
                        <td>₹{(part.qty * part.price).toFixed(2)}</td>
                        <td>
                          <button className="btn btn-sm btn-danger" onClick={() => removePart(part.uid)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mb-3 mt-3">
              <h5>Add Custom Part</h5>
              <div className="row g-2">
                <div className="col-md-3">
                  <input 
                    className="form-control" 
                    placeholder="Part No (search DB)" 
                    value={customPartNo} 
                    onChange={e => {
                      const partNo = e.target.value
                      setCustomPartNo(partNo)
                      setCustomMatched(false)
                      setSearchResults([])
                      // debounce search against entire parts DB
                      if (partSearchTimer.current) clearTimeout(partSearchTimer.current)
                      partSearchTimer.current = setTimeout(async () => {
                        const q = (partNo || '').trim()
                        if (!q) return
                        try {
                          const res = await fetch(`/api/quotations/parts/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
                          const data = await res.json()
                          const parts = data.parts || []
                          setSearchResults(parts)
                          // do not auto-select; wait for user to pick from suggestions
                        } catch (err) {
                          console.error('part search failed', err)
                        }
                      }, 300)
                    }} 
                  />
                </div>
                <div className="col-md-3">
                  <input 
                    className="form-control" 
                    placeholder="Description" 
                    value={customPartName}
                    onChange={e => { setCustomPartName(e.target.value); setCustomMatched(false) }}
                    disabled={customMatched}
                  />
                </div>
                <div className="col-md-2">
                  <input type="number" min="0" step="0.01" className="form-control" placeholder="Price" value={customPrice} onChange={e => { setCustomPrice(e.target.value); setCustomMatched(false) }} disabled={customMatched} />
                </div>
                <div className="col-md-2">
                  <input type="number" min="1" className="form-control" placeholder="Qty" value={customQty} onChange={e => setCustomQty(e.target.value)} />
                </div>
                <div className="col-md-auto">
                  <button className="btn btn-success" onClick={() => {
                    // add custom part to selectedParts with validation
                    if (!customPartName) {
                      alert('Please enter a description for the custom part')
                      return
                    }
                    const uid = `c-${Date.now()}-${Math.floor(Math.random()*1000)}`
                    const qty = Math.max(1, parseFloat(customQty) || 1)
                    const price = Math.max(0, parseFloat(customPrice) || 0)
                    selectedParts.push({ uid, part_id: null, part_no: customPartNo || '', part_name: customPartName, qty, price })
                    setSelectedParts([...selectedParts])
                    setCustomPartNo('')
                    setCustomPartName('')
                    setCustomPrice(0)
                    setCustomQty(1)
                    setCustomMatched(false)
                    setSearchResults([])
                  }}>Add</button>
                </div>
              </div>
            </div>
            {/* Suggestion dropdown */}
            {searchResults && searchResults.length > 0 && (
              <div className="list-group mt-1" style={{ maxWidth: 700 }}>
                {searchResults.map(p => (
                  <button key={p.id} type="button" className="list-group-item list-group-item-action" onClick={() => {
                    setCustomPartNo(p.part_no)
                    setCustomPartName(p.part_name)
                    setCustomPrice(p.price)
                    setCustomMatched(true)
                    setSearchResults([])
                  }}>
                    <div><strong>{p.part_no}</strong> — {p.part_name}</div>
                    <div className="text-muted">₹{(p.price || 0).toFixed(2)}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="mb-3 mt-3">
              <h5>Add Other Charge (transport, service etc.)</h5>
              <div className="row g-2">
                <div className="col-md-6">
                  <input className="form-control" placeholder="Charge description" value={chargeDescription} onChange={e => setChargeDescription(e.target.value)} />
                </div>
                <div className="col-md-2">
                  <input type="number" min="0" step="0.01" className="form-control" placeholder="Amount" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)} />
                </div>
                <div className="col-md-2">
                  <input type="number" min="1" className="form-control" placeholder="Qty" value={chargeQty} onChange={e => setChargeQty(e.target.value)} />
                </div>
                <div className="col-md-auto">
                  <button className="btn btn-secondary" onClick={() => {
                    if (!chargeDescription) {
                      alert('Please enter a description for the charge')
                      return
                    }
                    const uid = `chg-${Date.now()}-${Math.floor(Math.random()*1000)}`
                    const qty = Math.max(1, parseFloat(chargeQty) || 1)
                    const price = Math.max(0, parseFloat(chargeAmount) || 0)
                    // represent charge as a quotation item with empty part_no and part_id
                    selectedParts.push({ uid, part_id: null, part_no: '', part_name: chargeDescription, qty, price })
                    setSelectedParts([...selectedParts])
                    setChargeDescription('')
                    setChargeAmount(0)
                    setChargeQty(1)
                  }}>Add Charge</button>
                </div>
              </div>
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
                {/* Labour removed from customer-facing UI */}
                {discount_amount > 0 && (
                  <tr>
                    <td><strong>Discount (%):</strong></td>
                    <td>
                      <input type="number" style={{ width: '100px' }} value={discount} onChange={e => setDiscount(e.target.value)} min="0" max="100" /> % (₹{discount_amount.toFixed(2)})
                    </td>
                  </tr>
                )}
                {discount_amount === 0 && (
                  <tr>
                    <td><strong>Discount (%):</strong></td>
                    <td>
                      <input type="number" style={{ width: '100px' }} value={discount} onChange={e => setDiscount(e.target.value)} min="0" max="100" /> %
                    </td>
                  </tr>
                )}
                <tr>
                  <td><strong>VAT (13%):</strong></td>
                  <td>₹{vat.toFixed(2)}</td>
                </tr>
                <tr>
                  <td><strong>Total:</strong></td>
                  <td>₹{total.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan="2"><em>{numberToWords(total)}</em></td>
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
