// ===========================================================================
// Un cliente HTTP que aguanta un saludo TLS lento
//
// El `fetch` de Node aborta la conexión a los 10 segundos y ese límite no se
// puede subir sin pasarle un dispatcher de undici, que es una dependencia.
//
// Normalmente no importaría. Pero GDELT tarda entre 10 y 12 segundos SOLO EN EL
// SALUDO TLS. Medido con curl desde la máquina de desarrollo:
//
//     www.prensalibre.com   tls 0.23s
//     api.supabase.com      tls 0.10s
//     github.com            tls 0.16s
//     api.gdeltproject.org  tls 10.13s      <-- aquí
//
// El TCP conecta en 0.08 segundos; lo lento es el handshake. Como el `signal`
// de fetch no cubre esa fase, la señal de corroboración fallaba siempre con
// `UND_ERR_CONNECT_TIMEOUT`, y esa señal vale 30 de los 100 puntos del canal.
//
// Esto envuelve `node:https`, que sí deja fijar el tiempo, y devuelve un
// `Response` normal para que el resto del código no se entere. Sigue siendo
// cero dependencias.
//
// Solo hace GET: es lo único que necesitan las dos APIs de validación.
// ===========================================================================

import { request } from "node:https";

export type OpcionesFetchTolerante = {
  /** Tiempo total, saludo TLS incluido. */
  tiempoLimiteMs?: number;
};

export function crearFetchTolerante(opciones: OpcionesFetchTolerante = {}): typeof fetch {
  const tiempoLimiteMs = opciones.tiempoLimiteMs ?? 40_000;

  const tolerante = (entrada: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(
      typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
    );

    if (url.protocol !== "https:") {
      return Promise.reject(new Error(`crearFetchTolerante solo habla https, no ${url.protocol}`));
    }

    return new Promise<Response>((resolver, rechazar) => {
      const señal = init?.signal ?? null;

      if (señal?.aborted === true) {
        rechazar(new DOMException("Cancelado antes de empezar", "AbortError"));
        return;
      }

      const peticion = request(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port === "" ? 443 : Number(url.port),
          path: `${url.pathname}${url.search}`,
          method: "GET",
          headers: cabecerasPlanas(init?.headers),
          timeout: tiempoLimiteMs,
        },
        (respuesta) => {
          const trozos: Buffer[] = [];
          respuesta.on("data", (trozo: Buffer) => trozos.push(trozo));
          respuesta.on("end", () => {
            limpiar();
            resolver(
              new Response(Buffer.concat(trozos), {
                status: respuesta.statusCode ?? 502,
                headers: cabecerasDeRespuesta(respuesta.headers),
              }),
            );
          });
          respuesta.on("error", (error) => {
            limpiar();
            rechazar(error);
          });
        },
      );

      const abortar = () => {
        peticion.destroy(new DOMException("Cancelado", "AbortError"));
      };

      function limpiar() {
        señal?.removeEventListener("abort", abortar);
      }

      señal?.addEventListener("abort", abortar, { once: true });

      // `timeout` en las opciones solo cubre la inactividad del socket; hay que
      // atarlo a mano para que también corte un saludo que nunca termina.
      peticion.setTimeout(tiempoLimiteMs, () => {
        peticion.destroy(new Error(`Tiempo agotado (${tiempoLimiteMs} ms) contra ${url.hostname}`));
      });

      peticion.on("error", (error) => {
        limpiar();
        rechazar(error);
      });

      peticion.end();
    });
  };

  return tolerante as typeof fetch;
}

function cabecerasPlanas(cabeceras: HeadersInit | undefined): Record<string, string> {
  if (cabeceras === undefined) return {};
  const planas: Record<string, string> = {};
  new Headers(cabeceras).forEach((valor, clave) => {
    planas[clave] = valor;
  });
  return planas;
}

function cabecerasDeRespuesta(
  crudas: NodeJS.Dict<string | string[]>,
): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(crudas)) {
    if (valor === undefined) continue;
    salida[clave] = Array.isArray(valor) ? valor.join(", ") : valor;
  }
  return salida;
}
