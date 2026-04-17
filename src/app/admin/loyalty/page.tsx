'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface LoyaltyMember {
  id: string
  user_id: string | null
  email: string
  points_balance: number
  lifetime_points: number
  tier: 'bronze' | 'silver' | 'gold'
  created_at: string
  updated_at: string
}

interface LoyaltyTransaction {
  id: string
  email: string
  user_id: string | null
  type: 'earned' | 'redeemed' | 'adjusted' | 'expired'
  points: number
  description: string | null
  order_id: string | null
  created_at: string
}

export default function AdminLoyaltyPage() {
  const [members, setMembers] = useState<LoyaltyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)

  // Adjust points modal state
  const [adjustModal, setAdjustModal] = useState<{ email: string; memberId: string } | null>(null)
  const [adjustPoints, setAdjustPoints] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    bronze: 0,
    silver: 0,
    gold: 0,
    totalOutstandingPoints: 0,
  })

  // Status mail broadcast state
  const [mailStats, setMailStats] = useState({
    mailed: 0,
    notMailed: 0,
  })
  const [testEmail, setTestEmail] = useState('')
  const [broadcastBusy, setBroadcastBusy] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<any>(null)
  const [confirmBroadcast, setConfirmBroadcast] = useState(false)
  const [broadcastBatchSize, setBroadcastBatchSize] = useState(100)

  const PAGE_SIZE = 25
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [page, searchQuery])

  async function fetchStats() {
    try {
      const { count: total } = await supabase
        .from('loyalty_points')
        .select('*', { count: 'exact', head: true })

      const { count: bronze } = await supabase
        .from('loyalty_points')
        .select('*', { count: 'exact', head: true })
        .eq('tier', 'bronze')

      const { count: silver } = await supabase
        .from('loyalty_points')
        .select('*', { count: 'exact', head: true })
        .eq('tier', 'silver')

      const { count: gold } = await supabase
        .from('loyalty_points')
        .select('*', { count: 'exact', head: true })
        .eq('tier', 'gold')

      const { data: pointsData } = await supabase
        .from('loyalty_points')
        .select('points_balance')

      const totalOutstandingPoints = (pointsData || []).reduce(
        (sum, r) => sum + (r.points_balance || 0), 0
      )

      const { count: mailed } = await supabase
        .from('loyalty_points')
        .select('*', { count: 'exact', head: true })
        .not('status_mail_sent_at', 'is', null)

      const { count: notMailed } = await supabase
        .from('loyalty_points')
        .select('*', { count: 'exact', head: true })
        .is('status_mail_sent_at', null)

      setStats({
        total: total || 0,
        bronze: bronze || 0,
        silver: silver || 0,
        gold: gold || 0,
        totalOutstandingPoints,
      })

      setMailStats({
        mailed: mailed || 0,
        notMailed: notMailed || 0,
      })
    } catch (err: any) {
      console.error('Error fetching stats:', err)
    }
  }

  async function callBroadcast(payload: Record<string, any>) {
    setBroadcastBusy(true)
    setBroadcastResult(null)
    try {
      const res = await fetch('/api/admin/loyalty/send-status-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Broadcast mislukt')
        setBroadcastResult({ error: data.error, details: data.details })
      } else {
        setBroadcastResult(data)
        if (data.dryRun) {
          toast.success(`Dry run: ${data.wouldSendTo} ontvangers`)
        } else if (data.sent !== undefined) {
          toast.success(`Verstuurd: ${data.sent} (${data.failed || 0} mislukt)`)
          fetchStats()
        } else {
          toast.success('Test-mail verstuurd')
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Broadcast mislukt')
      setBroadcastResult({ error: err.message })
    } finally {
      setBroadcastBusy(false)
    }
  }

  async function handleSendTest() {
    if (!testEmail.trim()) {
      toast.error('Vul een test-e-mailadres in')
      return
    }
    await callBroadcast({ testEmail: testEmail.trim().toLowerCase() })
  }

  async function handleDryRun() {
    await callBroadcast({ dryRun: true, batchSize: broadcastBatchSize })
  }

  async function handleBroadcastAll() {
    if (!confirmBroadcast) {
      setConfirmBroadcast(true)
      return
    }
    setConfirmBroadcast(false)
    await callBroadcast({ batchSize: broadcastBatchSize })
  }

  async function fetchMembers() {
    try {
      setLoading(true)

      let query = supabase
        .from('loyalty_points')
        .select('*', { count: 'exact' })

      if (searchQuery) {
        query = query.ilike('email', `%${searchQuery}%`)
      }

      const { data, count, error } = await query
        .order('lifetime_points', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (error) throw error
      setMembers(data || [])
      setTotalCount(count || 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTransactions(email: string) {
    setTransactionsLoading(true)
    try {
      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setTransactions(data || [])
    } catch (err: any) {
      toast.error('Kan transacties niet laden')
    } finally {
      setTransactionsLoading(false)
    }
  }

  function handleExpandMember(memberId: string, email: string) {
    if (expandedMember === memberId) {
      setExpandedMember(null)
      setTransactions([])
    } else {
      setExpandedMember(memberId)
      fetchTransactions(email)
    }
  }

  function handleSearch() {
    setPage(1)
    setSearchQuery(searchEmail)
  }

  async function handleAdjustPoints() {
    if (!adjustModal || !adjustPoints || !adjustReason) {
      toast.error('Vul alle velden in')
      return
    }

    const points = parseInt(adjustPoints)
    if (isNaN(points) || points === 0) {
      toast.error('Voer een geldig aantal punten in')
      return
    }

    setAdjusting(true)
    try {
      // Find the member to get current balance
      const member = members.find(m => m.id === adjustModal.memberId)
      if (!member) throw new Error('Lid niet gevonden')

      const newBalance = member.points_balance + points
      if (newBalance < 0) {
        toast.error('Saldo kan niet negatief worden')
        setAdjusting(false)
        return
      }

      // Update balance
      const newLifetime = points > 0
        ? member.lifetime_points + points
        : member.lifetime_points

      let newTier: 'bronze' | 'silver' | 'gold' = 'bronze'
      if (newLifetime >= 1000) newTier = 'gold'
      else if (newLifetime >= 500) newTier = 'silver'

      const { error: updateError } = await supabase
        .from('loyalty_points')
        .update({
          points_balance: newBalance,
          lifetime_points: newLifetime,
          tier: newTier,
          updated_at: new Date().toISOString(),
        })
        .eq('id', adjustModal.memberId)

      if (updateError) throw updateError

      // Record transaction
      const { error: txError } = await supabase
        .from('loyalty_transactions')
        .insert({
          email: adjustModal.email,
          user_id: member.user_id,
          type: 'adjusted',
          points: points,
          description: `Handmatige aanpassing: ${adjustReason}`,
        })

      if (txError) throw txError

      toast.success(`${points > 0 ? '+' : ''}${points} punten aangepast`)
      setAdjustModal(null)
      setAdjustPoints('')
      setAdjustReason('')
      fetchMembers()
      fetchStats()

      if (expandedMember === adjustModal.memberId) {
        fetchTransactions(adjustModal.email)
      }
    } catch (err: any) {
      toast.error(`Fout: ${err.message}`)
    } finally {
      setAdjusting(false)
    }
  }

  const tierBadge = (tier: string) => {
    switch (tier) {
      case 'gold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'silver':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      default:
        return 'bg-amber-50 text-amber-800 border-amber-300'
    }
  }

  const transactionTypeBadge = (type: string) => {
    switch (type) {
      case 'earned':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'redeemed':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'adjusted':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'expired':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (loading && members.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Loyalty Programma</h1>
          <p className="text-gray-600">Beheer loyalty punten en leden</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white p-4 sm:p-6 border-2 border-gray-200">
          <div className="text-2xl sm:text-3xl font-bold text-brand-primary mb-1 sm:mb-2">{stats.total}</div>
          <div className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide">Totaal Leden</div>
        </div>
        <div className="bg-white p-4 sm:p-6 border-2 border-gray-200">
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 mb-1 sm:mb-2">{stats.bronze}</div>
          <div className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide">Bronze</div>
        </div>
        <div className="bg-white p-4 sm:p-6 border-2 border-gray-200">
          <div className="text-2xl sm:text-3xl font-bold text-gray-500 mb-1 sm:mb-2">{stats.silver}</div>
          <div className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide">Silver</div>
        </div>
        <div className="bg-white p-4 sm:p-6 border-2 border-gray-200">
          <div className="text-2xl sm:text-3xl font-bold text-yellow-500 mb-1 sm:mb-2">{stats.gold}</div>
          <div className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide">Gold</div>
        </div>
        <div className="bg-white p-4 sm:p-6 border-2 border-gray-200 col-span-2 md:col-span-1">
          <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">{stats.totalOutstandingPoints.toLocaleString('nl-NL')}</div>
          <div className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide">Uitstaande Punten</div>
        </div>
      </div>

      {/* Status Mail Broadcast */}
      <div className="bg-white border-2 border-black p-5 sm:p-6 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-display font-bold uppercase tracking-wide">
              Loyalty Statusmail
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Stuur een statusmail naar iedereen met een bestelling. Werkt ook voor guest checkouts — ontbrekende loyalty profielen worden automatisch aangemaakt op basis van historische bestellingen.
            </p>
          </div>
          <a
            href="/api/email-preview?template=loyalty-status-update&variant=broadcast&tier=silver&points=250&lifetime=620"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 border-2 border-black text-xs font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors whitespace-nowrap"
          >
            Preview openen
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="border-2 border-gray-200 p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Ontvangers totaal</div>
            <div className="text-2xl font-bold mt-1">
              {(mailStats.mailed + mailStats.notMailed).toLocaleString('nl-NL')}
            </div>
          </div>
          <div className="border-2 border-gray-200 p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Reeds gemaild</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {mailStats.mailed.toLocaleString('nl-NL')}
            </div>
          </div>
          <div className="border-2 border-gray-200 p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Nog te mailen</div>
            <div className="text-2xl font-bold text-brand-primary mt-1">
              {mailStats.notMailed.toLocaleString('nl-NL')}
            </div>
          </div>
          <div className="border-2 border-gray-200 p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Batch grootte</div>
            <input
              type="number"
              min={1}
              max={500}
              value={broadcastBatchSize}
              onChange={(e) => setBroadcastBatchSize(Math.max(1, parseInt(e.target.value) || 100))}
              className="w-full mt-1 px-2 py-1 border-2 border-gray-300 text-lg font-bold focus:border-brand-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">
              Test e-mailadres
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="jouw@email.nl"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              />
              <button
                onClick={handleSendTest}
                disabled={broadcastBusy}
                className="px-4 py-2 border-2 border-black text-sm font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors disabled:opacity-50"
              >
                {broadcastBusy ? '...' : 'Test sturen'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Stuurt 1 test-mail naar dit adres. Negeert broadcast-status.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">
              Broadcast acties
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleDryRun}
                disabled={broadcastBusy}
                className="px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase tracking-wider hover:border-black transition-colors disabled:opacity-50"
              >
                Dry run
              </button>
              <button
                onClick={handleBroadcastAll}
                disabled={broadcastBusy}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                  confirmBroadcast
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-brand-primary text-white hover:bg-brand-primary-hover'
                }`}
              >
                {broadcastBusy
                  ? 'Bezig...'
                  : confirmBroadcast
                  ? `Bevestig verstuur naar ${mailStats.notMailed} ontvangers`
                  : `Verstuur naar iedereen (${mailStats.notMailed})`}
              </button>
              {confirmBroadcast && (
                <button
                  onClick={() => setConfirmBroadcast(false)}
                  className="px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase tracking-wider hover:border-black transition-colors"
                >
                  Annuleren
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Alleen ontvangers zonder eerdere statusmail. Max {broadcastBatchSize} per run. Veilig om meerdere keren te draaien.
            </p>
          </div>
        </div>

        {broadcastResult && (
          <div
            className={`border-2 p-3 text-xs font-mono whitespace-pre-wrap break-words ${
              broadcastResult.error
                ? 'border-red-400 bg-red-50 text-red-800'
                : 'border-green-400 bg-green-50 text-green-900'
            }`}
          >
            {JSON.stringify(broadcastResult, null, 2)}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Zoek op e-mailadres..."
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
        />
        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold uppercase tracking-wider transition-colors"
        >
          Zoeken
        </button>
        {searchQuery && (
          <button
            onClick={() => { setSearchEmail(''); setSearchQuery(''); setPage(1) }}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-bold uppercase tracking-wider hover:border-black transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Members Table */}
      <div className="bg-white border-2 border-gray-200 overflow-hidden">
        {members.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Nog geen loyalty leden</h3>
            <p className="text-gray-500">Leden worden automatisch aangemaakt bij hun eerste bestelling.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-3">
              {members.map((member) => (
                <div key={member.id} className="border-2 border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-gray-900 truncate">{member.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Lid sinds {new Date(member.created_at).toLocaleDateString('nl-NL')}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-bold uppercase border ${tierBadge(member.tier)}`}>
                      {member.tier}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <div className="text-lg font-bold">{member.points_balance}</div>
                      <div className="text-xs text-gray-500">Punten balans</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-500">{member.lifetime_points}</div>
                      <div className="text-xs text-gray-500">Lifetime</div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleExpandMember(member.id, member.email)}
                      className="flex-1 text-center text-brand-primary border-2 border-brand-primary py-2 text-sm font-semibold"
                    >
                      {expandedMember === member.id ? 'Sluiten' : 'Transacties'}
                    </button>
                    <button
                      onClick={() => setAdjustModal({ email: member.email, memberId: member.id })}
                      className="flex-1 text-center text-gray-700 border-2 border-gray-300 py-2 text-sm font-semibold"
                    >
                      Aanpassen
                    </button>
                  </div>
                  {expandedMember === member.id && (
                    <div className="mt-4 border-t-2 border-gray-200 pt-4">
                      {transactionsLoading ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary" />
                        </div>
                      ) : transactions.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-2">Geen transacties</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between text-sm border border-gray-100 p-2">
                              <div className="min-w-0 flex-1">
                                <span className={`px-2 py-0.5 text-xs font-bold border ${transactionTypeBadge(tx.type)}`}>
                                  {tx.type}
                                </span>
                                <div className="text-xs text-gray-500 mt-1 truncate">{tx.description}</div>
                              </div>
                              <div className="text-right ml-2">
                                <div className={`font-bold ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {tx.points > 0 ? '+' : ''}{tx.points}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {new Date(tx.created_at).toLocaleDateString('nl-NL')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y-2 divide-gray-200">
                <caption className="sr-only">Overzicht van loyalty leden</caption>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Punten Balans</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Lifetime Punten</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tier</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Lid Sinds</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Acties</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member.id} className="group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleExpandMember(member.id, member.email)}
                          className="text-sm font-bold text-gray-900 hover:text-brand-primary transition-colors text-left"
                        >
                          {member.email}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-900">{member.points_balance.toLocaleString('nl-NL')}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{member.lifetime_points.toLocaleString('nl-NL')}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-bold uppercase border inline-block ${tierBadge(member.tier)}`}>
                          {member.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(member.created_at).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleExpandMember(member.id, member.email)}
                            className="text-brand-primary hover:text-brand-primary-hover font-semibold"
                          >
                            {expandedMember === member.id ? 'Sluiten' : 'Transacties'}
                          </button>
                          <button
                            onClick={() => setAdjustModal({ email: member.email, memberId: member.id })}
                            className="text-gray-600 hover:text-gray-900 font-semibold"
                          >
                            Aanpassen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Expanded Transaction History */}
              {expandedMember && (
                <div className="border-t-2 border-brand-primary bg-gray-50 p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-4">
                    Transactiegeschiedenis — {members.find(m => m.id === expandedMember)?.email}
                  </h3>
                  {transactionsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
                    </div>
                  ) : transactions.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Geen transacties gevonden</p>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <caption className="sr-only">Transactiegeschiedenis</caption>
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Datum</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Punten</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Beschrijving</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Order</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {new Date(tx.created_at).toLocaleDateString('nl-NL', {
                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 text-xs font-bold border ${transactionTypeBadge(tx.type)}`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`text-sm font-bold ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.points > 0 ? '+' : ''}{tx.points}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
                              {tx.description || '—'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-400 font-mono">
                              {tx.order_id ? tx.order_id.slice(0, 8).toUpperCase() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between p-4 border-t-2 border-gray-200">
            <div className="text-sm text-gray-600">
              Pagina {page} van {Math.ceil(totalCount / PAGE_SIZE)} ({totalCount} items)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase disabled:opacity-30 hover:border-black transition-colors"
              >
                Vorige
              </button>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(totalCount / PAGE_SIZE), p + 1))}
                disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
                className="px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase disabled:opacity-30 hover:border-black transition-colors"
              >
                Volgende
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Adjust Points Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white border-2 border-black p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-display font-bold mb-4">Punten Aanpassen</h3>
            <p className="text-sm text-gray-600 mb-4">{adjustModal.email}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">
                  Punten (positief = toevoegen, negatief = aftrekken)
                </label>
                <input
                  type="number"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                  placeholder="bijv. 50 of -25"
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Reden *</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="bijv. Compensatie klantenservice"
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAdjustPoints}
                  disabled={adjusting || !adjustPoints || !adjustReason}
                  className="flex-1 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adjusting ? 'Bezig...' : 'Opslaan'}
                </button>
                <button
                  onClick={() => { setAdjustModal(null); setAdjustPoints(''); setAdjustReason('') }}
                  className="flex-1 py-3 border-2 border-black font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
