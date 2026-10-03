// ===========================================================================
// La ruta del chatbot
//
// Es el único lugar de la aplicación que llama a un modelo de lenguaje
// (docs/arquitectura.md).
//
// Exige sesión. No por el contenido —el feed es público— sino por el
// PRESUPUESTO: el tope diario de la capa 0 solo significa algo si hay a quién
// contárselo. Mientras no había sesiones, todos los visitantes compartían un
// mismo contador y el tope no protegía nada; con 20 dólares de presupuesto eso
// era un agujero por donde se iba el proyecto, no un detalle.
// ===========================================================================

import { NextResponse } from "next/server";

import { conversar } from "../../../modules/chatbot/index.ts";
import { crearProveedor } from "../../../modules/chatbot/proveedor/index.ts";
import { clienteDeServicio } from "../../../lib/supabase.ts";
import { entornoDelModelo } from "../../../lib/entorno.ts";
import { perfilDelVisitante, tokenDePortador } from "../../../lib/supabase-servidor.ts";
import { crearPuertosDelChatbot } from "./puertos.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// La app móvil llama desde otro origen. Se permite cualquiera porque la
// identidad de esa vía viaja en la cabecera `Authorization`, que un sitio
// ajeno no tiene; las cookies no se aceptan de otro origen (no hay
// `Allow-Credentials`), así que la sesión del navegador sigue protegida por
// SameSite como antes.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(peticion: Request) {
  const respuesta = await atender(peticion);
  for (const [clave, valor] of Object.entries(CORS)) respuesta.headers.set(clave, valor);
  return respuesta;
}

async function atender(peticion: Request): Promise<NextResponse> {
  // Dos caminos a la misma identidad: la cookie del navegador, o el token que
  // manda la app móvil. En los dos, `getUser` valida contra Supabase.
  const perfil = await perfilDelVisitante({
    token: tokenDePortador(peticion.headers.get("authorization")),
  });
  if (perfil === null) {
    return NextResponse.json(
      { error: "Hay que entrar para usar el asistente. El feed sí se puede leer sin cuenta." },
      { status: 401 },
    );
  }

  let mensaje: string;

  try {
    const cuerpo = (await peticion.json()) as { mensaje?: unknown };
    if (typeof cuerpo.mensaje !== "string") {
      return NextResponse.json({ error: "Falta el campo «mensaje»." }, { status: 400 });
    }
    mensaje = cuerpo.mensaje;
  } catch {
    return NextResponse.json({ error: "El cuerpo no es JSON." }, { status: 400 });
  }

  const configuracion = entornoDelModelo();

  let proveedor;
  try {
    proveedor = crearProveedor({
      modo: configuracion.modo,
      api: { llave: configuracion.llaveAnthropic },
    });
  } catch (error) {
    // Un error de configuración no es culpa de quien pregunta, y el mensaje de
    // `ConfiguracionInvalida` dice exactamente qué poner.
    console.error("El chatbot no está configurado:", error);
    return NextResponse.json(
      {
        error:
          "El chatbot no está configurado en este entorno. " +
          (error instanceof Error ? error.message : ""),
      },
      { status: 503 },
    );
  }

  const cliente = clienteDeServicio();

  try {
    const { idConversacion, deps } = await crearPuertosDelChatbot(cliente, proveedor, {
      idUsuario: perfil.usuario.id,
      topeDiarioPorUsuario: configuracion.topeMensajesPorUsuarioDia,
      topeGastoUsd: configuracion.topeGastoUsd,
    });

    const resultado = await conversar(
      { idUsuario: perfil.usuario.id, idConversacion, mensaje },
      deps,
    );

    return NextResponse.json({
      respuesta: resultado.respuesta,
      bloqueado: resultado.bloqueado,
      capaQueCorto: resultado.capaQueCorto,
      categoria: resultado.registro.categoria,
      noticiasCitadas: resultado.noticiasCitadas,
      confianza: resultado.confianza,
    });
  } catch (error) {
    console.error("Falló el turno del chatbot:", error);
    return NextResponse.json(
      { error: "No se pudo procesar la consulta. El detalle quedó en los logs del servidor." },
      { status: 500 },
    );
  }
}
