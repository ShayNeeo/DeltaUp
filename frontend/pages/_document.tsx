import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <style>{`
          /* Initial loading splash screen */
          html {
            background: linear-gradient(135deg, #ffffff via #f8fafc to #ffffff);
          }

          body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #ffffff via #f8fafc to #ffffff);
          }

          #__next {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }

          /* Prevent layout shift */
          html, body {
            width: 100%;
            height: 100%;
            overflow-x: hidden;
          }
        `}</style>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
