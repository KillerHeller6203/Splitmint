'use client'
import { useEffect, useState } from 'react'
import {
  TrendingUp, TrendingDown, Minus, ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { balances as api, groups as groupsApi, expenses as expApi, type Balance, type BalanceSummary, type Group, type Expense } from '@/lib/api'
import { fmt, computeSettlements, avatarColor } from '@/lib/utils'
import Avatar from '@/components/Avatar'

export default function BalancesPage() {
  const [bals, setBals] = useState<Balance[]>([])
  const [summary, setSummary] = useState<BalanceSummary>({ total_owed: 0, total_owing: 0, net_balance: 0 })
  const [groups, setGroups] = useState<Group[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'ledger' | 'chart'>('overview')

  useEffect(() => {
    Promise.all([api.list(), api.summary(), groupsApi.list(), expApi.list()])
      .then(([b, s, g, e]) => {
        setBals(b ?? [])
        setSummary(s ?? { total_owed: 0, total_owing: 0, net_balance: 0 })
        setGroups(g ?? [])
        setExpenses(e ?? [])
      })
      .catch((error) => {
        console.error(error)
        setBals([])
        setSummary({ total_owed: 0, total_owing: 0, net_balance: 0 })
        setGroups([])
        setExpenses([])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>

  const settlements = computeSettlements(bals)
  const netPositive = summary.net_balance > 0
  const netZero = summary.net_balance === 0

  // Contribution chart data: total spent per group
  const groupSpend = groups.map(g => ({
    name: g.name.length > 10 ? g.name.slice(0, 10) + '…' : g.name,
    total: expenses.filter(e => e.group_id === g.id).reduce((s, e) => s + parseFloat(e.amount), 0),
    fill: avatarColor(g.name),
  })).filter(g => g.total > 0)

  // Per-person pie data
  const memberSpend: Record<string, number> = {}
  for (const e of expenses) {
    const payerName = e.paid_by_name || 'Unknown'
    memberSpend[payerName] = (memberSpend[payerName] ?? 0) + parseFloat(e.amount)
  }
  const pieData = Object.entries(memberSpend).map(([name, value]) => ({ name, value, fill: avatarColor(name) }))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Balances</h1>
        <p className="text-slate-500 mt-1">See who owes whom across all your groups</p>
      </div>

      {/* Summary cards */}
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

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['overview', 'Overview'], ['ledger', 'Ledger'], ['chart', 'Charts']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Outstanding balances */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-4">Outstanding Balances</h2>
            {bals.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
                <p className="font-semibold text-slate-700">All settled up!</p>
                <p className="text-sm text-slate-500 mt-1">No outstanding balances.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bals.map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar name={b.user_name} size="md" />
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{b.user_name}</p>
                        <p className="text-xs text-slate-500">owes <span className="font-medium text-slate-700">{b.owes_to_name}</span></p>
                      </div>
                    </div>
                    <span className="font-bold text-rose-600">{fmt(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settlement suggestions */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-1">Settlement Suggestions</h2>
            <p className="text-xs text-slate-500 mb-4">Minimum transactions to settle all debts</p>
            {settlements.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
                <p className="font-semibold text-slate-700">All clear!</p>
                <p className="text-sm text-slate-500 mt-1">No transactions needed.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {settlements.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 border border-teal-100">
                    <Avatar name={s.from} size="md" />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-semibold text-slate-900 text-sm truncate">{s.from}</span>
                      <ArrowRight className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      <span className="font-semibold text-slate-900 text-sm truncate">{s.to}</span>
                    </div>
                    <span className="font-bold text-teal-700 flex-shrink-0">{fmt(s.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEDGER TAB */}
      {tab === 'ledger' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Directional Balance Ledger</h2>
            <p className="text-xs text-slate-500 mt-0.5">All money flows across your groups</p>
          </div>
          {bals.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              No outstanding balances — all settled up!
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">From</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">To</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-600">Amount</th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bals.map((b, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={b.user_name} size="sm" />
                        <span className="font-medium text-slate-900">{b.user_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={b.owes_to_name} size="sm" />
                        <span className="font-medium text-slate-900">{b.owes_to_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-rose-600">{fmt(b.amount)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="badge badge-red">Pending</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CHARTS TAB */}
      {tab === 'chart' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending per group */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-4">Total Spent per Group</h2>
            {groupSpend.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-10">No expense data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={groupSpend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip formatter={(v: number) => [fmt(v), 'Total']} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {groupSpend.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Who paid what */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-4">Contributions by Payer</h2>
            {pieData.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-10">No expense data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [fmt(v), 'Paid']} />
                  <Legend formatter={(value) => <span className="text-sm text-slate-700">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
