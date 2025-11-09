import React, { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      setIsAuthenticated(true)
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleOAuthLogin = () => {
    const oauthUrl = `${process.env.NEXT_PUBLIC_API_URL}/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_CLIENT_ID}&redirect_uri=${window.location.origin}/oauth/callback&response_type=code&scope=transfer%20balance`
    window.location.href = oauthUrl
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">DeltaUp</h1>
          <div className="flex gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-gray-700">Welcome, {user?.name}</span>
                <button onClick={() => {
                  localStorage.clear()
                  setIsAuthenticated(false)
                }} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                  Logout
                </button>
              </>
            ) : (
              <button onClick={handleOAuthLogin} className="bg-primary text-white px-6 py-2 rounded hover:bg-blue-700">
                Login with OpenAPI
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center text-white mb-12">
          <h2 className="text-5xl font-bold mb-4">Welcome to DeltaUp</h2>
          <p className="text-xl opacity-90">Fast, Secure, and Easy Bank Transfers</p>
        </div>

        {isAuthenticated ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/transfer">
              <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transform hover:scale-105 transition">
                <div className="text-4xl mb-4">💸</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Bank Transfer</h3>
                <p className="text-gray-600">Send money to another account</p>
              </div>
            </Link>

            <Link href="/balance">
              <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transform hover:scale-105 transition">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Check Balance</h3>
                <p className="text-gray-600">View your account balance</p>
              </div>
            </Link>

            <Link href="/qr-payment">
              <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transform hover:scale-105 transition">
                <div className="text-4xl mb-4">📱</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">QR Payment</h3>
                <p className="text-gray-600">Send money via QR code</p>
              </div>
            </Link>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-lg shadow-lg text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Get Started</h3>
            <p className="text-gray-600 mb-6">Login with OpenAPI to access your account</p>
            <button onClick={handleOAuthLogin} className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-blue-700 text-lg font-semibold">
              Login with OpenAPI
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
