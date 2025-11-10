import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Layout from '@/components/Layout'
import PageTransition from '@/components/PageTransition'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <PageTransition>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </PageTransition>
  )
}
