import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="icon" href="/favicon.ico" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var storageKey = 'theme';
                  var className = 'dark';
                  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
                  var localStorageTheme = localStorage.getItem(storageKey);
                  var systemTheme = darkQuery.matches;
                  
                  if (localStorageTheme === 'dark' || (!localStorageTheme && systemTheme)) {
                    document.documentElement.classList.add(className);
                  } else {
                    document.documentElement.classList.remove(className);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <style>{`
          /* Initial loading splash screen */
          html {
            background: #f8fafc; /* Light mode background */
          }
          
          html.dark {
            background: #020617; /* Dark mode background */
          }

          body {
            margin: 0;
            padding: 0;
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
