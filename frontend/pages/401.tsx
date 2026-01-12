import Link from 'next/link'

export default function Custom401() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-900 via-orange-900 to-red-900">
            <div className="text-center px-6">
                <div className="text-9xl font-bold text-white mb-4">401</div>
                <h1 className="text-4xl font-bold text-white mb-4">Unauthorized</h1>
                <p className="text-orange-200 text-xl mb-8">
                    You need to be logged in to access this page.
                </p>
                <Link
                    href="/login"
                    className="inline-block px-8 py-4 bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 text-white font-semibold rounded-xl transition-all shadow-lg"
                >
                    Login
                </Link>
            </div>
        </div>
    )
}
