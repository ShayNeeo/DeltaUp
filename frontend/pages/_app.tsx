import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Layout from '@/components/Layout'
import PageTransition from '@/components/PageTransition'
import ChatbotBubble from '@/components/ChatbotBubble'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <PageTransition>
      <Layout>
        <Component {...pageProps} />
        <ChatbotBubble />
      </Layout>
    </PageTransition>
  )
}
