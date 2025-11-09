import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'

export default function OAuthCallback() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { code } = router.query
        
        if (!code) {
          setError('No authorization code received')
          setLoading(false)
          return
        }

        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/oauth/token`, {
          code,
          client_id: process.env.NEXT_PUBLIC_CLIENT_ID,
          client_secret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
          redirect_uri: `${window.location.origin}/oauth/callback`,
          grant_type: 'authorization_code',
        })

        localStorage.setItem('token', response.data.access_token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        
        setLoading(false)
        router.push('/')
      } catch (err: any) {
        setError(err.response?.data?.message || 'OAuth callback failed')
        setLoading(false)
      }
    }

    if (router.isReady) {
      handleCallback()
    }
  }, [router.isReady, router.query])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
        <div className="text-white text-center">
          <h1 className="text-3xl font-bold mb-4">Processing Login...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
        <div className="bg-white p-8 rounded-lg text-center max-w-md">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Login Failed</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => router.push('/')} className="bg-primary text-white px-6 py-2 rounded hover:bg-blue-700">
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return null
}
