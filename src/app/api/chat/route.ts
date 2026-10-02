// ===========================================================================
// La ruta del chatbot
//
// Es el único lugar de la aplicación que llama a un modelo de lenguaje
// (docs/arquitectura.md).
//
// ⚠ DEUDA CONOCIDA, la misma que en src/lib/consultas.ts: sin autenticación no
// hay a quién atribuirle los turnos ni sobre quién aplicar el cupo diario, así
// que se usa un identificador de demostración. El tope por usuario de la capa 0
// —que es lo que protege el presupuesto— **no está haciendo nada real mientras
// no haya sesiones**, porque todos los visitantes comparten el mismo contador.
// Decirlo acá y no en el informe es lo que evita que se olvide.
// ===========================================================================

import { NextResponse } from "next/server";

import { conversar } from "../../../modules/chatbot/index.ts";
import { crearProveedor } from "../../../modules/chatbot/proveedor/index.ts";
import { clienteDeServicio } from "../../../lib/supabase.ts";
import { entornoDelModelo } from "../../../lib/entorno.ts";
import { crearPuertosDelChatbot, USUARIO_DE_DEMOSTRACION } from "./puertos.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(peticion: Request) {
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
      topeDiarioPorUsuario: configuracion.topeMensajesPorUsuarioDia,
    });

    const resultado = await conversar(
      { idUsuario: USUARIO_DE_DEMOSTRACION, idConversacion, mensaje },
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
