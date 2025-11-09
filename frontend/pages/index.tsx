import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface UserData {
  name: string
  email?: string
  account_number?: string
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      setIsAuthenticated(true)
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleOAuthLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'deltaup-client'
    const redirectUri = `${typeof window !== 'undefined' ? window.location.origin : ''}/oauth/callback`
    const oauthUrl = `${process.env.NEXT_PUBLIC_API_URL}/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=transfer%20balance`
    window.location.href = oauthUrl
  }

  const handleLogout = () => {
    localStorage.clear()
    setIsAuthenticated(false)
    setUser(null)
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Welcome Section */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-light text-slate-900 mb-2">
              Welcome back, <span className="font-semibold">{user.name}</span>
            </h1>
            <p className="text-slate-500">Manage your finances with ease</p>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Transfer */}
            <Link href="/transfer">
              <div className="group p-6 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Send Money</h3>
                <p className="text-sm text-slate-500">Transfer funds instantly</p>
              </div>
            </Link>

            {/* Balance */}
            <Link href="/balance">
              <div className="group p-6 bg-white rounded-xl border border-slate-200 hover:border-green-300 hover:shadow-md transition-all cursor-pointer">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Check Balance</h3>
                <p className="text-sm text-slate-500">View your account balance</p>
              </div>
            </Link>

            {/* QR Payment */}
            <Link href="/qr-payment">
              <div className="group p-6 bg-white rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer">
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">QR Payment</h3>
                <p className="text-sm text-slate-500">Scan to pay instantly</p>
              </div>
            </Link>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Status</p>
              <p className="font-semibold text-slate-900">Active</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Email</p>
              <p className="font-semibold text-slate-900 truncate">{user.email}</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Account</p>
              <p className="font-semibold text-slate-900 truncate">{user.account_number || 'N/A'}</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Member</p>
              <p className="font-semibold text-slate-900">2025</p>
            </div>
          </div>

          {/* Logout Button */}
          <div className="mt-12 flex justify-center">
            <button
              onClick={handleLogout}
              className="px-8 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col items-center justify-center px-4">
      {/* Hero Section */}
      <div className="max-w-2xl mx-auto text-center mb-12">
        <div className="inline-block p-3 bg-blue-50 rounded-full mb-6">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-5xl font-light text-slate-900 mb-4">
          DeltaUp
        </h1>
        <p className="text-lg text-slate-600 mb-2">Modern financial management</p>
        <p className="text-sm text-slate-500">Built for speed and simplicity</p>
      </div>

      {/* Features Preview */}
      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="text-center">
          <div className="text-3xl mb-3">⚡</div>
          <h3 className="font-semibold text-slate-900 mb-1">Instant Transfers</h3>
          <p className="text-sm text-slate-500">Send money in seconds</p>
        </div>
        <div className="text-center">
          <div className="text-3xl mb-3">🔒</div>
          <h3 className="font-semibold text-slate-900 mb-1">Secure & Safe</h3>
          <p className="text-sm text-slate-500">Bank-grade security</p>
        </div>
        <div className="text-center">
          <div className="text-3xl mb-3">📱</div>
          <h3 className="font-semibold text-slate-900 mb-1">QR Payments</h3>
          <p className="text-sm text-slate-500">Modern payment methods</p>
        </div>
      </div>

      {/* Login Button */}
      <button
        onClick={handleOAuthLogin}
        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
      >
        Sign In with OAuth
      </button>

      {/* Footer */}
      <div className="mt-16 text-center text-sm text-slate-500">
        <p>A modern fintech platform for financial management</p>
      </div>
    </div>
  )
}
