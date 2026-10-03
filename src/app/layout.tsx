import type { Metadata } from "next";

import "./globals.css";
import { VentanaDelChatbot } from "./ventana-chatbot.tsx";
import { perfilDelVisitante } from "../lib/supabase-servidor.ts";
import { salir } from "./entrar/acciones.ts";
import { SECCIONES } from "../lib/secciones.ts";

export const metadata: Metadata = {
  title: "Noticias Verificadas",
  description:
    "Plataforma de noticias con validación de fuentes y ranking auditable. Proyecto de CC3106 Responsible AI.",
};

// Las secciones de la cabecera. Cada una filtra la portada de verdad; una barra
// de navegación decorativa es precisamente el adorno que este proyecto no
// quiere, porque promete una organización que no existe. «Última hora» no va:
// es lo que ya muestra la portada.
const SECCIONES_DE_LA_CABECERA = SECCIONES.filter((s) => s.clave !== "general");

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
            <div className="fila">
              <h1>
                <a href="/">Noticias Verificadas</a>
              </h1>
              <p className="lema">
                Cada noticia pasa por cinco señales antes de publicarse, y el orden lo calcula una
                fórmula que podés revisar.
              </p>

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
            </div>

            <nav>
              <a href="/">Portada</a>
              {SECCIONES_DE_LA_CABECERA.map(({ clave, nombre }) => (
                <a key={clave} href={`/?seccion=${clave}`}>
                  {nombre}
                </a>
              ))}

              <a className="interno" href="/como-funciona">
                ¿Cómo funciona?
              </a>
              {perfil?.permisos.has("noticias_publicar") === true ? (
                <a className="interno" href="/publicar">
                  Publicar
                </a>
              ) : null}
              {perfil?.permisos.has("noticias_moderar") === true ? (
                <a className="interno" href="/moderacion">
                  Moderación
                </a>
              ) : null}
            </nav>
          </header>
          {children}
        </div>
        <VentanaDelChatbot />
      </body>
    </html>
  );
}
