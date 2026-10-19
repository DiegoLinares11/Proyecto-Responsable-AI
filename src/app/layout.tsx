import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { perfilDelVisitante } from "../lib/supabase-servidor.ts";
import { salir } from "./entrar/acciones.ts";
import { URL_DE_LA_APP } from "../lib/app.ts";

export const metadata: Metadata = {
  title: "NEXO · Redacción",
  icons: { icon: "/marca/nexo-icono.png" },
  description:
    "La redacción de NEXO: publicar, moderar y administrar. Proyecto de CC3106 Responsible AI.",
};

// Los mismos TTF locales que Expo, servidos desde el propio portal.
const titulares = localFont({
  src: [
    { path: "../../app-movil/assets/fonts/Manrope_600SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../app-movil/assets/fonts/Manrope_700Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--fuente-titulares", display: "swap", fallback: ["Arial"],
});
const texto = localFont({
  src: [
    { path: "../../app-movil/assets/fonts/Inter_400Regular.ttf", weight: "400", style: "normal" },
    { path: "../../app-movil/assets/fonts/Inter_400Regular_Italic.ttf", weight: "400", style: "italic" },
    { path: "../../app-movil/assets/fonts/Inter_600SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../app-movil/assets/fonts/Inter_700Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--fuente-texto", display: "swap", fallback: ["Arial"],
});
const google = localFont({
  src: "../../app-movil/assets/fonts/GoogleSans_500Medium.ttf",
  weight: "500", variable: "--fuente-google", display: "swap", fallback: ["Arial"], preload: false,
});

/** El PNG suministrado, con su proporción y tipografía originales. */
function Sello() {
  return (
    <span className="nexo-logo" aria-hidden="true"><span className="nexo-arte" /></span>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Esto decide QUÉ MOSTRAR, no qué se puede hacer. La autorización vive en las
  // políticas de fila: un enlace escondido no protege nada, un `insert` que
  // falla sí.
  const perfil = await perfilDelVisitante();

  return (
    <html lang="es-GT" className={`${titulares.variable} ${texto.variable} ${google.variable}`}>
      <body>
        <div className="contenedor">
          <header className="marca">
            <div className="fila">
              <h1>
                <a href="/" aria-label="NEXO, redacción">
                  <Sello />
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
              {perfil?.permisos.has("usuarios_administrar") === true ? <a href="/gasto">Gasto</a> : null}
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
