import Link from 'next/link'

export default function Custom403() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-rose-900 to-pink-900">
            <div className="text-center px-6">
                <div className="text-9xl font-bold text-white mb-4">403</div>
                <h1 className="text-4xl font-bold text-white mb-4">Forbidden</h1>
                <p className="text-rose-200 text-xl mb-8">
                    You don&apos;t have permission to access this resource.
                </p>
                <Link
                    href="/dashboard"
                    className="inline-block px-8 py-4 bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 text-white font-semibold rounded-xl transition-all shadow-lg"
                >
                    Go to Dashboard
                </Link>
            </div>
        </div>
    )
}
