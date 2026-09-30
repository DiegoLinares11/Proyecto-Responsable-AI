// ===========================================================================
// Descarga de URLs enviadas por terceros
//
// La señal de URL verificable descarga una dirección QUE ESCRIBIÓ EL
// PUBLICADOR. Eso convierte al servidor en un cliente HTTP a las órdenes de un
// usuario, y es la definición de un SSRF: alguien con permiso de publicar envía
// una noticia con `url_original` apuntando a `http://169.254.169.254/` (los
// metadatos de la nube, donde viven credenciales) o a un servicio interno que
// no está expuesto a internet, y el servidor se lo trae de mil amores.
//
// En este proyecto el publicador es una persona de confianza, pero «de
// confianza» no es un control de seguridad: basta una cuenta comprometida. Y en
// un trabajo de IA responsable, el canal que valida el contenido no puede ser
// el agujero.
//
// Tres defensas:
//
//   1. Solo http y https. Ni `file:`, ni `gopher:`, ni `data:`.
//   2. Se resuelve el nombre y se comprueba que NINGUNA de sus direcciones sea
//      privada. Comprobar solo el texto del host no sirve: un atacante registra
//      un dominio público que resuelve a 127.0.0.1.
//   3. Los redirecciones se siguen a mano, revisando cada salto. Un destino
//      público que redirige a uno privado es el bypass clásico.
// ===========================================================================

import { lookup } from "node:dns/promises";
import type { RespuestaHttp, TraerUrl } from "./tipos.ts";

const NOMBRES_PROHIBIDOS: ReadonlyArray<RegExp> = [
  /^localhost$/i,
  /\.localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^metadata\./i,
  /^metadata$/i,
];

/** ¿Esta IPv4 pertenece a un rango que no debe alcanzarse desde el servidor? */
function esIpv4Privada(ip: string): boolean {
  const partes = ip.split(".").map(Number);
  if (partes.length !== 4 || partes.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true; // si no se entiende, no se confía
  }
  const [a = 0, b = 0, c = 0] = partes;

  if (a === 0) return true;                        // 0.0.0.0/8
  if (a === 10) return true;                       // privada
  if (a === 127) return true;                      // loopback
  if (a === 169 && b === 254) return true;         // link-local y metadatos de nube
  if (a === 172 && b >= 16 && b <= 31) return true; // privada
  if (a === 192 && b === 168) return true;         // privada
  if (a === 192 && b === 0 && c === 0) return true; // IETF
  if (a === 100 && b >= 64 && b <= 127) return true; // NAT del operador
  if (a === 198 && (b === 18 || b === 19)) return true; // pruebas de red
  if (a >= 224) return true;                       // multicast y reservadas
  return false;
}

function esIpv6Privada(ip: string): boolean {
  const normal = ip.toLowerCase().replace(/^\[|\]$/g, "");

  if (normal === "::1" || normal === "::") return true;

  // IPv4 embebida: ::ffff:127.0.0.1
  const embebida = normal.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (embebida?.[1] !== undefined) return esIpv4Privada(embebida[1]);

  if (/^f[cd]/.test(normal)) return true;  // fc00::/7, direcciones únicas locales
  if (/^fe[89ab]/.test(normal)) return true; // fe80::/10, link-local
  return false;
}

export function esDireccionPrivada(ip: string): boolean {
  return ip.includes(":") ? esIpv6Privada(ip) : esIpv4Privada(ip);
}

export class DestinoNoPermitido extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = "DestinoNoPermitido";
  }
}

export type ResolverNombre = (host: string) => Promise<string[]>;

const resolverConDns: ResolverNombre = async (host) => {
  const direcciones = await lookup(host, { all: true, verbatim: true });
  return direcciones.map((d) => d.address);
};

/**
 * Lanza `DestinoNoPermitido` si la URL no se puede consultar con seguridad.
 * El resolvedor se inyecta para poder probar esto sin depender del DNS.
 */
export async function verificarDestinoPermitido(
  url: string,
  resolver: ResolverNombre = resolverConDns,
): Promise<void> {
  let destino: URL;
  try {
    destino = new URL(url);
  } catch {
    throw new DestinoNoPermitido("La URL no se puede interpretar");
  }

  if (destino.protocol !== "http:" && destino.protocol !== "https:") {
    throw new DestinoNoPermitido(`Protocolo no permitido: ${destino.protocol}`);
  }

  const host = destino.hostname.replace(/^\[|\]$/g, "");

  if (NOMBRES_PROHIBIDOS.some((patron) => patron.test(host))) {
    throw new DestinoNoPermitido(`Nombre de host no permitido: ${host}`);
  }

  // Si el host ya es una IP, se revisa directo y no hace falta resolver.
  const esIpLiteral = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
  if (esIpLiteral) {
    if (esDireccionPrivada(host)) {
      throw new DestinoNoPermitido(`Dirección no enrutable públicamente: ${host}`);
    }
    return;
  }

  let direcciones: string[];
  try {
    direcciones = await resolver(host);
  } catch {
    throw new DestinoNoPermitido(`El nombre ${host} no resuelve`);
  }

  if (direcciones.length === 0) {
    throw new DestinoNoPermitido(`El nombre ${host} no resuelve a ninguna dirección`);
  }

  // TODAS tienen que ser públicas. Basta una privada para rechazar: un nombre
  // que resuelve a varias direcciones podría alternar entre ellas.
  const privada = direcciones.find((d) => esDireccionPrivada(d));
  if (privada !== undefined) {
    throw new DestinoNoPermitido(
      `El nombre ${host} resuelve a una dirección no enrutable públicamente (${privada})`,
    );
  }
}

export type OpcionesDeDescarga = {
  /** Tiempo máximo total, en milisegundos. */
  tiempoLimiteMs?: number;
  /** Cuánto HTML se lee como máximo. Los metadatos están en la cabecera. */
  bytesMaximos?: number;
  /** Cuántos redireccionamientos se siguen. */
  saltosMaximos?: number;
  resolver?: ResolverNombre;
  buscar?: typeof fetch;
};

const AGENTE =
  "NoticiasVerificadas/0.2 (proyecto academico CC3106; validacion de fuentes)";

/**
 * Descarga una URL comprobando cada salto. Devuelve el estado y el HTML; lanza
 * solo cuando NO SE PUDO AVERIGUAR nada (red caída, destino no permitido,
 * tiempo agotado), porque la señal distingue «respondió mal» de «no se pudo
 * consultar» y esa diferencia decide si una noticia puede publicarse sola.
 */
export function crearTraerUrl(opciones: OpcionesDeDescarga = {}): TraerUrl {
  const tiempoLimiteMs = opciones.tiempoLimiteMs ?? 8_000;
  const bytesMaximos = opciones.bytesMaximos ?? 512 * 1024;
  const saltosMaximos = opciones.saltosMaximos ?? 3;
  const resolver = opciones.resolver ?? resolverConDns;
  const buscar = opciones.buscar ?? fetch;

  return async function traerUrl(url: string): Promise<RespuestaHttp> {
    const corte = AbortSignal.timeout(tiempoLimiteMs);
    let actual = url;

    for (let salto = 0; salto <= saltosMaximos; salto++) {
      await verificarDestinoPermitido(actual, resolver);

      const respuesta = await buscar(actual, {
        redirect: "manual",
        signal: corte,
        headers: { "user-agent": AGENTE, accept: "text/html,application/xhtml+xml" },
      });

      const esRedireccion = respuesta.status >= 300 && respuesta.status < 400;
      const siguiente = respuesta.headers.get("location");

      if (esRedireccion && siguiente !== null) {
        if (salto === saltosMaximos) {
          throw new Error(`Demasiados redireccionamientos desde ${url}`);
        }
        actual = new URL(siguiente, actual).toString();
        continue;
      }

      const tipo = respuesta.headers.get("content-type") ?? "";
      if (respuesta.status >= 200 && respuesta.status < 300 && !/html|xml|text/i.test(tipo)) {
        // Un PDF o una imagen no traen metadatos Open Graph que comparar.
        return { estado: respuesta.status, html: "" };
      }

      return {
        estado: respuesta.status,
        html: await leerConTope(respuesta, bytesMaximos),
      };
    }

    throw new Error(`Demasiados redireccionamientos desde ${url}`);
  };
}

/** Lee el cuerpo hasta un tope, para que una página enorme no vacíe la memoria. */
async function leerConTope(respuesta: Response, bytesMaximos: number): Promise<string> {
  if (respuesta.body === null) return "";

  const lector = respuesta.body.getReader();
  const trozos: Uint8Array[] = [];
  let total = 0;

  try {
    while (total < bytesMaximos) {
      const { done, value } = await lector.read();
      if (done) break;
      if (value === undefined) continue;
      trozos.push(value);
      total += value.byteLength;
    }
  } finally {
    await lector.cancel().catch(() => {});
  }

  const todo = new Uint8Array(total);
  let posicion = 0;
  for (const trozo of trozos) {
    todo.set(trozo.subarray(0, Math.min(trozo.byteLength, total - posicion)), posicion);
    posicion += trozo.byteLength;
    if (posicion >= total) break;
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(todo);
}
