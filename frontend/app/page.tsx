'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Users, Receipt, ArrowRight, Plus, Minus } from 'lucide-react'
import { groups as groupsApi, balances as balancesApi, type Group, type BalanceSummary } from '@/lib/api'
import { fmt, fmtDate } from '@/lib/utils'
import Avatar from '@/components/Avatar'

export default function DashboardPage() {
  const router = useRouter()
  const [groupList, setGroupList] = useState<Group[]>([])
  const [summary, setSummary] = useState<BalanceSummary>({ total_owed: 0, total_owing: 0, net_balance: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    Promise.all([groupsApi.list(), balancesApi.summary()])
      .then(([g, s]) => {
        setGroupList(g ?? [])
        setSummary(s ?? { total_owed: 0, total_owing: 0, net_balance: 0 })
      })
      .catch((error) => {
        if (error instanceof Error && error.message.toLowerCase().includes('not authenticated')) {
          localStorage.removeItem('token')
          router.push('/login')
          return
        }
        console.error(error)
        setGroupList([])
        setSummary({ total_owed: 0, total_owing: 0, net_balance: 0 })
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>

  const netPositive = summary.net_balance > 0
  const netZero = summary.net_balance === 0

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Overview</h1>
        <p className="text-slate-500 mt-1">Your expense snapshot across all groups</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-icon bg-emerald-50">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">You are owed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{fmt(summary.total_owed)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-rose-50">
            <TrendingDown className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">You owe</p>
            <p className="text-2xl font-bold text-rose-600 mt-0.5">{fmt(summary.total_owing)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className={`stat-icon ${netZero ? 'bg-slate-50' : netPositive ? 'bg-emerald-50' : 'bg-rose-50'}`}>
            <Minus className={`w-6 h-6 ${netZero ? 'text-slate-400' : netPositive ? 'text-emerald-600' : 'text-rose-600'}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net balance</p>
            <p className={`text-2xl font-bold mt-0.5 ${netZero ? 'text-slate-500' : netPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {summary.net_balance >= 0 ? '+' : ''}{fmt(summary.net_balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Groups + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Groups */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              <h2 className="font-bold text-slate-900">Your Groups</h2>
            </div>
            <Link href="/dashboard/groups" className="btn btn-ghost btn-sm text-teal-600 hover:bg-teal-50">
              <Plus className="w-3.5 h-3.5" /> New
            </Link>
          </div>

          {groupList.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm mb-4">No groups yet. Create one to get started.</p>
              <Link href="/dashboard/groups" className="btn btn-primary btn-sm">Create group</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {groupList.slice(0, 5).map(g => (
                <div key={g.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
                      <span className="text-teal-700 font-bold text-sm">{g.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{g.name}</p>
                      <p className="text-xs text-slate-500">{g.members?.length ?? 0} member{(g.members?.length ?? 0) !== 1 ? 's' : ''} · {fmtDate(g.created_at)}</p>
                    </div>
                  </div>
                  <Link href="/dashboard/groups" className="text-slate-300 hover:text-teal-500 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
              {groupList.length > 5 && (
                <Link href="/dashboard/groups" className="block text-center text-sm text-teal-600 hover:underline pt-1">
                  +{groupList.length - 5} more groups
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Receipt className="w-5 h-5 text-teal-600" />
            <h2 className="font-bold text-slate-900">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            {[
              { href: '/dashboard/expenses', Icon: Receipt, color: 'bg-blue-50 text-blue-600', label: 'Add an expense', sub: 'Record a new shared expense' },
              { href: '/dashboard/balances', Icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600', label: 'Check balances', sub: 'See who owes whom' },
              { href: '/dashboard/groups', Icon: Users, color: 'bg-violet-50 text-violet-600', label: 'Manage groups', sub: 'Add or remove participants' },
            ].map(({ href, Icon, color, label, sub }) => (
              <Link key={href} href={href} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all group">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{label}</p>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
