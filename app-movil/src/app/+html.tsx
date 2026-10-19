import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import { PALETA_EDITORIAL } from '@/constants/tema';

/** Safari expone los insets de pantalla completa con viewport-fit=cover. */
export default function Documento({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();
  return (
    <html {...htmlAttributes} lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <ScrollViewStyleReset />
        <style>{`
          body { -webkit-font-smoothing: antialiased; }
          :is(a, button, input, textarea, select, [role="button"], [role="link"], [role="radio"], [role="tab"]):focus-visible {
            outline: 3px solid ${PALETA_EDITORIAL.naranja}; outline-offset: 3px;
            box-shadow: 0 0 0 2px ${PALETA_EDITORIAL.negro};
          }
          ::selection { background: #FFE2CC; color: ${PALETA_EDITORIAL.negro}; }
        `}</style>
        {headNodes}
      </head>
      <body {...bodyAttributes}>{children}{bodyNodes}</body>
    </html>
  );
}
