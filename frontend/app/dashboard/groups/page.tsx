'use client'
import { useEffect, useState } from 'react'
import { Plus, Users, Trash2, Pencil, UserPlus, UserMinus, Loader2 } from 'lucide-react'
import { groups as api, type Group, type Member } from '@/lib/api'
import { fmtDate } from '@/lib/utils'
import Modal from '@/components/Modal'
import Avatar from '@/components/Avatar'

export default function GroupsPage() {
  const [list, setList] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')

  // Edit modal
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [editName, setEditName] = useState('')

  // Add member modal
  const [memberGroup, setMemberGroup] = useState<Group | null>(null)
  const [memberEmail, setMemberEmail] = useState('')

  const fetch = async () => {
    try { setList(await api.list()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.create(newName, newEmail || undefined)
      setNewName(''); setNewEmail(''); setShowCreate(false)
      fetch()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editGroup) return
    setSaving(true); setError('')
    try {
      await api.update(editGroup.id, editName)
      setEditGroup(null); fetch()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (g: Group) => {
    if (!confirm(`Delete "${g.name}"? All linked expenses will also be removed.`)) return
    try { await api.delete(g.id); fetch() }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed') }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberGroup) return
    setSaving(true); setError('')
    try {
      await api.addMember(memberGroup.id, memberEmail)
      setMemberEmail(''); setMemberGroup(null); fetch()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  const handleRemoveMember = async (g: Group, m: Member) => {
    if (!confirm(`Remove ${m.name} from "${g.name}"?`)) return
    try { await api.removeMember(g.id, m.id); fetch() }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed') }
  }

  if (loading) return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Groups</h1>
          <p className="text-slate-500 mt-1">Manage your expense groups and participants</p>
        </div>
        <button onClick={() => { setShowCreate(true); setError('') }} className="btn btn-primary btn-md">
          <Plus className="w-4 h-4" /> New Group
        </button>
      </div>

      {/* Grid */}
      {list.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">No groups yet</h3>
          <p className="text-slate-500 text-sm mb-6">Create a group to start splitting expenses</p>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-md mx-auto">
            Create your first group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {list.map(g => {
            const canAddMore = (g.members?.length ?? 0) < 4 // max 3 participants + primary
            return (
              <div key={g.id} className="card p-5 flex flex-col gap-4">
                {/* Group header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-teal-700 font-bold">{g.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{g.name}</h3>
                      <p className="text-xs text-slate-500">Created {fmtDate(g.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditGroup(g); setEditName(g.name); setError('') }}
                      className="btn btn-ghost btn-sm p-1.5 rounded-lg text-slate-400 hover:text-teal-600"
                      title="Rename"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(g)}
                      className="btn btn-ghost btn-sm p-1.5 rounded-lg text-slate-400 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Members */}
                <div className="space-y-1.5">
                  {(g.members ?? []).map(m => (
                    <div key={m.id} className="flex items-center justify-between group py-1">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{m.name}</p>
                          <p className="text-xs text-slate-400">{m.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(g, m)}
                        className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-sm p-1 rounded text-slate-300 hover:text-red-400 transition-opacity"
                        title="Remove member"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span className="badge badge-gray">
                    <Users className="w-3 h-3" /> {g.members?.length ?? 0} / 4
                  </span>
                  <button
                    disabled={!canAddMore}
                    onClick={() => { setMemberGroup(g); setMemberEmail(''); setError('') }}
                    className="btn btn-ghost btn-sm text-teal-600 hover:bg-teal-50 disabled:opacity-40"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Add member
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal title="Create New Group" onClose={() => { setShowCreate(false); setError('') }}>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div>
              <label className="label">Group name</label>
              <input className="input" required placeholder="e.g. Roommates, Trip to Goa" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="label">First member email <span className="normal-case font-normal text-slate-400">(optional)</span></label>
              <input className="input" type="email" placeholder="friend@example.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowCreate(false); setError('') }} className="btn btn-ghost btn-md flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary btn-md flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editGroup && (
        <Modal title="Rename Group" onClose={() => { setEditGroup(null); setError('') }}>
          <form onSubmit={handleEdit} className="space-y-4">
            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div>
              <label className="label">Group name</label>
              <input className="input" required value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setEditGroup(null); setError('') }} className="btn btn-ghost btn-md flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary btn-md flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add member modal */}
      {memberGroup && (
        <Modal title={`Add member to "${memberGroup.name}"`} onClose={() => { setMemberGroup(null); setError('') }}>
          <form onSubmit={handleAddMember} className="space-y-4">
            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <p className="text-sm text-slate-500">The user must already have a SplitMint account.</p>
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" required placeholder="friend@example.com" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setMemberGroup(null); setError('') }} className="btn btn-ghost btn-md flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary btn-md flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {saving ? 'Adding…' : 'Add member'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
