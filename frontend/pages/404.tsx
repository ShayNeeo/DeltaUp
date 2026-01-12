import Link from 'next/link'

export default function Custom404() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-red-900">
            <div className="text-center px-6">
                <div className="text-9xl font-bold text-white mb-4 animate-pulse">404</div>
                <h1 className="text-4xl font-bold text-white mb-4">Page Not Found</h1>
                <p className="text-purple-200 text-xl mb-8">
                    Oops! The page you&apos;re looking for doesn&apos;t exist.
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
