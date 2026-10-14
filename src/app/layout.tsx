import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader, Public_Sans } from "next/font/google";

import "./globals.css";
import { perfilDelVisitante } from "../lib/supabase-servidor.ts";
import { salir } from "./entrar/acciones.ts";
import { URL_DE_LA_APP } from "../lib/app.ts";

export const metadata: Metadata = {
  title: "Noticias Verificadas · Redacción",
  description:
    "La redacción de Noticias Verificadas: publicar, moderar y administrar. Proyecto de CC3106 Responsible AI.",
};

// Las letras de la identidad. next/font las baja al compilar y las sirve desde
// este mismo portal: el navegador del lector no le pide nada a Google.
const titulares = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--fuente-titulares", display: "swap" });
const texto = Public_Sans({ subsets: ["latin"], style: ["normal", "italic"], variable: "--fuente-texto", display: "swap" });
const numeros = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--fuente-numeros", display: "swap" });

/** El sello: un check en dos anillos, celeste y tinta. El mismo de la app. */
function Sello() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill="none" stroke="#3b8fd0" strokeWidth="4" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M22 33 L29 40 L43 24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Esto decide QUÉ MOSTRAR, no qué se puede hacer. La autorización vive en las
  // políticas de fila: un enlace escondido no protege nada, un `insert` que
  // falla sí.
  const perfil = await perfilDelVisitante();

  return (
    <html lang="es-GT" className={`${titulares.variable} ${texto.variable} ${numeros.variable}`}>
      <body>
        <div className="contenedor">
          <header className="marca">
            <div className="fila">
              <h1>
                <a href="/" aria-label="Noticias Verificadas, redacción">
                  <Sello />
                  <span className="palabras">
                    <span className="antes">NOTICIAS</span>
                    <span className="nombre">Verificadas</span>
                  </span>
                </a>
              </h1>
              <p className="lema">
                La redacción: acá se publica, se modera y se administra. Las noticias se leen en la
                app.
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
              <a href="/">Redacción</a>
              {perfil?.permisos.has("noticias_publicar") === true ? <a href="/publicar">Publicar</a> : null}
              {perfil?.permisos.has("noticias_moderar") === true ? <a href="/moderacion">Moderación</a> : null}
              {perfil?.permisos.has("usuarios_administrar") === true ? (
                <a href="/administracion">Administración</a>
              ) : null}
              <a className="interno" href="/como-funciona">
                ¿Cómo funciona?
              </a>
              <a className="interno" href="/privacidad">
                Privacidad
              </a>
              <a className="interno a-la-app" href={URL_DE_LA_APP}>
                Leer en la app ↗
              </a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
