import type { Metadata } from "next";

import "./globals.css";
import { VentanaDelChatbot } from "./ventana-chatbot.tsx";
import { perfilDelVisitante } from "../lib/supabase-servidor.ts";
import { salir } from "./entrar/acciones.ts";

export const metadata: Metadata = {
  title: "Noticias Verificadas",
  description:
    "Plataforma de noticias con validación de fuentes y ranking auditable. Proyecto de CC3106 Responsible AI.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Esto decide QUÉ MOSTRAR, no qué se puede hacer. La autorización vive en las
  // políticas de fila: un enlace escondido no protege nada, un `insert` que
  // falla sí.
  const perfil = await perfilDelVisitante();

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
              {perfil?.permisos.has("noticias_publicar") === true ? (
                <a href="/publicar">Publicar</a>
              ) : null}
              {perfil?.permisos.has("noticias_moderar") === true ? (
                <a href="/moderacion">Moderación</a>
              ) : null}

              <span className="sesion">
                {perfil === null ? (
                  <a href="/entrar">Entrar</a>
                ) : (
                  <>
                    <span>
                      {perfil.nombre} · {perfil.rol}
                    </span>
                    <form action={salir}>
                      <button type="submit">Salir</button>
                    </form>
                  </>
                )}
              </span>
            </nav>
          </header>
          {children}
        </div>
        <VentanaDelChatbot />
      </body>
    </html>
  );
}
