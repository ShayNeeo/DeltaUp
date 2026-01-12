import { useEffect } from 'react'
import Link from 'next/link'

export default function Logout() {

    useEffect(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }, [])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-12 border border-white/20 text-center max-w-md">
                <div className="text-6xl mb-6">👋</div>
                <h1 className="text-4xl font-bold text-white mb-4">You&apos;ve been logged out</h1>
                <p className="text-gray-300 mb-8">Thank you for using DeltaUp. See you soon!</p>
                <Link
                    href="/login"
                    className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg transition-all"
                >
                    Sign In Again
                </Link>
            </div>
        </div>
    )
}
