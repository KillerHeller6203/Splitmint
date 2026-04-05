'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  Plus, Receipt, Trash2, Pencil, Search, Filter,
  X, Loader2, Zap, Sparkles,
} from 'lucide-react'
import {
  expenses as api, groups as groupsApi,
  type Expense, type Group,
} from '@/lib/api'
import { fmt, fmtDate } from '@/lib/utils'
import Modal from '@/components/Modal'
import Avatar from '@/components/Avatar'

const SPLIT_LABELS: Record<string, string> = {
  equal: 'Equal split',
  percentage: 'Percentage',
  custom: 'Custom',
}

type ExpenseSplitForm = {
  user_id: number
  amount: string
  percentage: string
}

type ExpenseFormState = {
  group_id: string
  description: string
  amount: string
  split_type: 'equal' | 'percentage' | 'custom'
  date: string
  splits: ExpenseSplitForm[]
}

interface ExpenseFormProps {
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  submitLabel: string
  error: string
  groups: Group[]
  form: ExpenseFormState
  setForm: React.Dispatch<React.SetStateAction<ExpenseFormState>>
  saving: boolean
  editMode: boolean
  selectedGroup?: Group
  onGroupChange: (groupId: string) => void
  setSplitValue: (userId: number, field: 'amount' | 'percentage', value: string) => void
  splitTotalWarning: boolean
}

function ExpenseForm({ onSubmit, onCancel, submitLabel, error, groups, form, setForm, saving, editMode, selectedGroup, onGroupChange, setSplitValue, splitTotalWarning }: ExpenseFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {!editMode && (
        <div>
          <label className="label">Group</label>
          <select required className="input" value={form.group_id} onChange={e => onGroupChange(e.target.value)}>
            <option value="">Select a group</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="label">Description</label>
        <input
          className="input"
          required
          placeholder="e.g. Dinner, Groceries"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Amount (₹)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <label className="label">Split type</label>
        <select className="input" value={form.split_type} onChange={e => setForm(f => ({ ...f, split_type: e.target.value as ExpenseFormState['split_type'], splits: f.group_id ? f.splits : [] }))}>
          <option value="equal">Equal split</option>
          <option value="percentage">Percentage split</option>
          <option value="custom">Custom amount</option>
        </select>
      </div>
      {form.split_type === 'custom' && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">Enter a custom amount for each member. Total must equal the expense amount.</p>
          {selectedGroup ? (
            <div className="space-y-3">
              {selectedGroup.members.map(member => {
                const split = form.splits.find(s => s.user_id === member.id)
                return (
                  <div key={member.id} className="grid grid-cols-[1fr_120px] gap-3 items-end">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                    <div>
                      <label className="label sr-only">Amount for {member.name}</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={split?.amount ?? ''}
                        onChange={e => setSplitValue?.(member.id, 'amount', e.target.value)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a group first to enter custom split amounts.</p>
          )}
          {splitTotalWarning && <p className="text-sm text-red-600">The custom share total must equal the expense amount.</p>}
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-md flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn btn-primary btn-md flex-1">
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default function ExpensesPage() {
  const [list, setList] = useState<Expense[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // filters
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterMinAmt, setFilterMinAmt] = useState('')
  const [filterMaxAmt, setFilterMaxAmt] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // create / edit modals
  const [showCreate, setShowCreate] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const initForm: ExpenseFormState = { group_id: '', description: '', amount: '', split_type: 'equal', date: '', splits: [] }
  const [form, setForm] = useState<ExpenseFormState>(initForm)

  const selectedGroup = groups.find(g => String(g.id) === form.group_id)

  const initializeSplits = (group?: Group) => group ? group.members.map(member => ({ user_id: member.id, amount: '', percentage: '' })) : []

  const handleGroupChange = (groupId: string) => {
    const group = groups.find(g => String(g.id) === groupId)
    setForm(f => ({
      ...f,
      group_id: groupId,
      splits: group ? initializeSplits(group) : [],
    }))
  }

  const setSplitValue = (userId: number, field: 'amount' | 'percentage', value: string) => {
    setForm(f => ({
      ...f,
      splits: f.splits.map(split =>
        split.user_id === userId ? { ...split, [field]: value } : split
      ),
    }))
  }

  useEffect(() => {
    if ((form.split_type === 'custom' || form.split_type === 'percentage') && selectedGroup && form.splits.length === 0) {
      setForm(f => ({ ...f, splits: initializeSplits(selectedGroup) }))
    }
  }, [form.split_type, selectedGroup])

  const customAmountTotal = form.splits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0)
  const splitTotalWarning = form.split_type === 'custom' && form.amount !== '' && Math.abs((parseFloat(form.amount) || 0) - customAmountTotal) > 0.01

  // MintSense AI
  const [showMint, setShowMint] = useState(false)
  const [mintInput, setMintInput] = useState('')
  const [mintLoading, setMintLoading] = useState(false)
  const [mintError, setMintError] = useState('')

  const fetchAll = async () => {
    try {
      const [e, g] = await Promise.all([api.list(), groupsApi.list()])
      setList(e); setGroups(g)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const filtered = useMemo(() => {
    return list.filter(e => {
      if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false
      if (filterGroup && String(e.group_id) !== filterGroup) return false
      const dateStr = e.date || e.created_at
      if (filterFrom && dateStr < filterFrom) return false
      if (filterTo && dateStr > filterTo + 'T23:59:59') return false
      const amt = parseFloat(e.amount)
      if (filterMinAmt && amt < parseFloat(filterMinAmt)) return false
      if (filterMaxAmt && amt > parseFloat(filterMaxAmt)) return false
      return true
    })
  }, [list, search, filterGroup, filterFrom, filterTo, filterMinAmt, filterMaxAmt])

  const activeFilters = [filterGroup, filterFrom, filterTo, filterMinAmt, filterMaxAmt].filter(Boolean).length

  const handleCreate = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (splitTotalWarning) {
      setError('Custom split amounts must total the expense amount.')
      return
    }

    setSaving(true); setError('')
    try {
      const payload: any = {
        group_id: parseInt(form.group_id),
        description: form.description,
        amount: parseFloat(form.amount),
        split_type: form.split_type as 'equal' | 'percentage' | 'custom',
        date: form.date || undefined,
      }

      if (form.split_type === 'custom') {
        payload.splits = form.splits.map(split => ({
          user_id: split.user_id,
          amount: parseFloat(split.amount),
          percentage: undefined,
        }))
      }

      await api.create(payload)
      setForm(initForm); setShowCreate(false); fetchAll()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  const handleEdit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!editExpense) return
    if (splitTotalWarning) {
      setError('Custom split amounts must total the expense amount.')
      return
    }

    setSaving(true); setError('')
    try {
      const payload: any = {
        description: form.description,
        amount: parseFloat(form.amount),
        split_type: form.split_type as 'equal' | 'percentage' | 'custom',
        date: form.date || undefined,
      }

      if (form.split_type === 'custom') {
        payload.splits = form.splits.map(split => ({
          user_id: split.user_id,
          amount: parseFloat(split.amount),
          percentage: undefined,
        }))
      }

      await api.update(editExpense.id, payload)
      setEditExpense(null); setForm(initForm); fetchAll()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (e: Expense) => {
    if (!confirm(`Delete "${e.description}"?`)) return
    try { await api.delete(e.id); fetchAll() }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed') }
  }

  const openEdit = (e: Expense) => {
    setEditExpense(e)
    setForm({
      group_id: String(e.group_id),
      description: e.description,
      amount: parseFloat(e.amount).toString(),
      split_type: e.split_type,
      date: e.date ? e.date.slice(0, 10) : e.created_at.slice(0, 10),
      splits: e.splits ? e.splits.map(split => ({
        user_id: split.user_id,
        amount: split.amount.toString(),
        percentage: split.percentage ? split.percentage.toString() : '',
      })) : [],
    })
    setError('')
  }

  // MintSense AI parse
  const handleMintSense = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setMintLoading(true); setMintError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/expenses/parse-natural-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text: mintInput }),
      })
      if (!res.ok) throw new Error('AI parsing failed')
      const parsed = await res.json()
      setForm({
        group_id: parsed.group_id ? String(parsed.group_id) : '',
        description: parsed.description || mintInput,
        amount: parsed.amount ? String(parsed.amount) : '',
        split_type: parsed.split_type || 'equal',
        date: parsed.date || '',
      })
      setShowMint(false); setMintInput(''); setShowCreate(true)
    } catch (err: unknown) { setMintError(err instanceof Error ? err.message : 'Failed') }
    finally { setMintLoading(false) }
  }

  if (loading) return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500 mt-1">Track all shared expenses across groups</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowMint(true); setMintInput(''); setMintError('') }}
            className="btn btn-ghost btn-md border border-slate-200 text-violet-600 hover:bg-violet-50"
          >
            <Sparkles className="w-4 h-4" /> MintSense AI
          </button>
          <button
            disabled={groups.length === 0}
            onClick={() => { setShowCreate(true); setForm(initForm); setError('') }}
            className="btn btn-primary btn-md"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search expenses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`btn btn-md border ${showFilters || activeFilters > 0 ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 btn-ghost'}`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilters > 0 && <span className="badge badge-green ml-1">{activeFilters}</span>}
        </button>
      </div>

      {/* Filters drawer */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="label">Group</label>
            <select className="input" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
              <option value="">All groups</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">From date</label>
            <input type="date" className="input" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To date</label>
            <input type="date" className="input" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          </div>
          <div>
            <label className="label">Min amount (₹)</label>
            <input type="number" className="input" placeholder="0" value={filterMinAmt} onChange={e => setFilterMinAmt(e.target.value)} />
          </div>
          <div>
            <label className="label">Max amount (₹)</label>
            <input type="number" className="input" placeholder="∞" value={filterMaxAmt} onChange={e => setFilterMaxAmt(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setFilterGroup(''); setFilterFrom(''); setFilterTo(''); setFilterMinAmt(''); setFilterMaxAmt('') }}
              className="btn btn-ghost btn-md text-red-500 hover:bg-red-50 w-full"
            >
              <X className="w-4 h-4" /> Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Results count */}
      {list.length > 0 && (
        <p className="text-sm text-slate-500">
          Showing <strong>{filtered.length}</strong> of <strong>{list.length}</strong> expenses
        </p>
      )}

      {/* List */}
      {list.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">No expenses yet</h3>
          <p className="text-slate-500 text-sm mb-6">
            {groups.length === 0 ? 'Create a group first, then add expenses.' : 'Add your first shared expense.'}
          </p>
          {groups.length > 0 && (
            <button onClick={() => { setShowCreate(true); setForm(initForm) }} className="btn btn-primary btn-md mx-auto">
              Add expense
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No expenses match your filters.</p>
          <button onClick={() => { setSearch(''); setFilterGroup(''); setFilterFrom(''); setFilterTo(''); setFilterMinAmt(''); setFilterMaxAmt('') }} className="btn btn-ghost btn-md mt-4 mx-auto text-teal-600">
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {filtered.map(e => (
            <div key={e.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Receipt className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{e.description}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-slate-500">{e.group_name}</span>
                  <span className="text-slate-300">·</span>
                  <div className="flex items-center gap-1">
                    <Avatar name={e.paid_by_name} size="sm" />
                    <span className="text-xs text-slate-500">{e.paid_by_name}</span>
                  </div>
                  <span className="text-slate-300">·</span>
                  <span className="badge badge-gray">{SPLIT_LABELS[e.split_type]}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-slate-900">{fmt(parseFloat(e.amount))}</p>
                <p className="text-xs text-slate-400">{fmtDate(e.date || e.created_at)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(e)} className="btn btn-ghost btn-sm p-1.5 rounded-lg text-slate-400 hover:text-teal-600">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(e)} className="btn btn-ghost btn-sm p-1.5 rounded-lg text-slate-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal title="Add Expense" onClose={() => { setShowCreate(false); setForm(initForm) }}>
          <ExpenseForm
            onSubmit={handleCreate}
            submitLabel="Add expense"
            error={error}
            groups={groups}
            form={form}
            setForm={setForm}
            saving={saving}
            editMode={false}
            selectedGroup={selectedGroup}
            onGroupChange={handleGroupChange}
            setSplitValue={setSplitValue}
            splitTotalWarning={splitTotalWarning}
            onCancel={() => { setShowCreate(false); setForm(initForm); setError('') }}
          />
        </Modal>
      )}

      {/* Edit modal */}
      {editExpense && (
        <Modal title="Edit Expense" onClose={() => { setEditExpense(null); setForm(initForm); setError('') }}>
          <ExpenseForm
            onSubmit={handleEdit}
            submitLabel="Save changes"
            error={error}
            groups={groups}
            form={form}
            setForm={setForm}
            saving={saving}
            editMode={true}
            selectedGroup={selectedGroup}
            onGroupChange={handleGroupChange}
            setSplitValue={setSplitValue}
            splitTotalWarning={splitTotalWarning}
            onCancel={() => { setEditExpense(null); setForm(initForm); setError('') }}
          />
        </Modal>
      )}

      {/* MintSense modal */}
      {showMint && (
        <Modal title="MintSense AI" onClose={() => setShowMint(false)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-violet-50 rounded-xl px-4 py-3">
              <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-violet-700">
                Describe an expense in plain language and AI will parse it into a structured entry.
              </p>
            </div>
            {mintError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{mintError}</p>}
            <form onSubmit={handleMintSense} className="space-y-4">
              <div>
                <label className="label">Describe the expense</label>
                <textarea
                  className="input h-24 resize-none"
                  required
                  placeholder='e.g. "Paid ₹1200 for dinner with Riya and Arjun, split equally"'
                  value={mintInput}
                  onChange={e => setMintInput(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowMint(false)} className="btn btn-ghost btn-md flex-1">Cancel</button>
                <button type="submit" disabled={mintLoading} className="btn btn-md flex-1 bg-violet-600 text-white hover:bg-violet-700">
                  {mintLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {mintLoading ? 'Parsing…' : 'Parse with AI'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  )
}
