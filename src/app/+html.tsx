export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <style>{'#root,body,html{height:100%} body{overflow:hidden} #root{display:flex}'}</style>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LLM Picker" />
        <meta name="application-name" content="LLM Picker" />
        <meta name="theme-color" content="#208AEF" />
      </head>
      <body>{children}</body>
    </html>
  );
}
