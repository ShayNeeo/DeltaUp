import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { transactionAPI } from '@/lib/api'

interface FormData {
  recipient_account: string
  amount: string
  description: string
}

export default function Transfer() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState<FormData>({
    recipient_account: '',
    amount: '',
    description: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await transactionAPI.transfer({
        recipient_account: formData.recipient_account,
        amount: parseFloat(formData.amount),
        description: formData.description
      })

      setSuccess('Transfer successful! 🎉')
      setFormData({ recipient_account: '', amount: '', description: '' })
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Transfer failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-background min-h-screen font-sans pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-slideUp">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Bank Transfer</h1>
            <p className="text-muted mt-1">Send money to any DeltaUp account instantly</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-highlight transition-all border border-transparent hover:border-border"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="glass-panel rounded-2xl p-8 sm:p-10">
              {error && (
                <div className="mb-6 bg-danger/10 border border-danger/20 text-danger px-5 py-4 rounded-xl flex items-center gap-3 text-sm font-medium">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-5 py-4 rounded-xl flex items-center gap-3 text-sm font-medium">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-7">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2.5">
                    Recipient Account Number
                  </label>
                  <input
                    type="text"
                    name="recipient_account"
                    value={formData.recipient_account}
                    onChange={handleChange}
                    placeholder="Enter 12-digit account number"
                    required
                    className="w-full px-4 py-3.5 bg-surface-highlight border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2.5">
                    Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-lg">$</span>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      required
                      className="w-full pl-9 pr-4 py-3.5 bg-surface-highlight border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono text-xl font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2.5">
                    Description <span className="text-muted font-normal">(Optional)</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="What is this transfer for?"
                    rows={4}
                    className="w-full px-4 py-3.5 bg-surface-highlight border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-base"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing Transaction...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Authorize Transfer
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Tips/Info */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-bold text-foreground mb-2">Security Note</h3>
              <p className="text-sm text-muted leading-relaxed">
                All transactions are signed with your JWT token and processed through ACID-compliant database transactions.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 mb-4 overflow-hidden">
                <img src="/apple-touch-icon.png" alt="DeltaUp Logo" className="w-full h-full object-cover opacity-80" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Instant Settlement</h3>
              <p className="text-sm text-muted leading-relaxed">
                Transfers between DeltaUp accounts settle instantly. The recipient will see the funds in their dashboard immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}