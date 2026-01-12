import Link from 'next/link'

export default function Custom500() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
            <div className="text-center px-6">
                <div className="text-9xl font-bold text-white mb-4">500</div>
                <h1 className="text-4xl font-bold text-white mb-4">Internal Server Error</h1>
                <p className="text-gray-300 text-xl mb-8">
                    Something went wrong on our end. Please try again later.
                </p>
                <div className="flex gap-4 justify-center">
                    <Link
                        href="/dashboard"
                        className="inline-block px-8 py-4 bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 text-white font-semibold rounded-xl transition-all shadow-lg"
                    >
                        Go to Dashboard
                    </Link>
                    <button
                        onClick={() => window.location.reload()}
                        className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg"
                    >
                        Retry
                    </button>
                </div>
            </div>
        </div>
    )
}
