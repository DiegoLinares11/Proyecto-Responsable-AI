import type { Metadata } from "next";

import "./globals.css";
import { VentanaDelChatbot } from "./ventana-chatbot.tsx";

export const metadata: Metadata = {
  title: "Noticias Verificadas",
  description:
    "Plataforma de noticias con validación de fuentes y ranking auditable. Proyecto de CC3106 Responsible AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-GT">
      <body>
        <div className="contenedor">
          <header className="marca">
            <h1>Noticias Verificadas</h1>
            <p>
              Cada noticia pasa por cinco señales antes de publicarse, y el orden del feed se
              calcula con una fórmula que podés revisar.
            </p>
            <nav>
              <a href="/">Feed</a>
              <a href="/como-funciona">¿Cómo funciona?</a>
            </nav>
          </header>
          {children}
        </div>
        <VentanaDelChatbot />
      </body>
    </html>
  );
}
