// ===========================================================================
// Fase 2 — Canal de validación de veracidad
//
// Superficie pública del módulo. Nada de aquí llama a un modelo de lenguaje;
// el costo en tokens es cero (docs/presupuesto.md).
//
// Uso típico, donde sea que se arme la ruta que recibe una noticia:
//
//     const veredicto = await evaluarVeracidad(noticia, {
//       buscarFuente: crearBuscadorDeFuentes(consultarFuentesEnSupabase),
//       traerUrl: crearTraerUrl(),
//       buscarCobertura: crearBuscadorDeCobertura(),
//       buscarDesmentidos: crearBuscadorDeDesmentidos(process.env.GOOGLE_FACT_CHECK_API_KEY),
//     });
//
//     // El puntaje NUNCA se guarda solo: siempre con su desglose.
//     await guardar(veredicto.estado, veredicto.puntaje,
//                   filasDeValidacion(idNoticia, veredicto));
// ===========================================================================

export {
  CREDIBILIDAD_BUEN_NIVEL,
  CREDIBILIDAD_DESCONOCIDA,
  MAXIMOS,
  UMBRAL_REVISION,
  UMBRAL_VERIFICADA,
  type ArticuloExterno,
  type BuscarCobertura,
  type BuscarDesmentidos,
  type BuscarFuente,
  type ClaveSenal,
  type Dependencias,
  type Desmentido,
  type EstadoVeredicto,
  type FuenteRegistrada,
  type NoticiaAValidar,
  type RespuestaHttp,
  type ResultadoSenal,
  type TraerUrl,
  type Veredicto,
} from "./tipos.ts";

export { evaluarVeracidad, filasDeValidacion } from "./evaluar.ts";

export {
  crearBuscadorDeCobertura,
  crearBuscadorEnCadena,
  crearBuscadorDeDesmentidos,
  crearBuscadorDeFuentes,
  type ConsultarFuentes,
} from "./adaptadores.ts";

export {
  crearTraerUrl,
  esDireccionPrivada,
  verificarDestinoPermitido,
  DestinoNoPermitido,
} from "./red-segura.ts";

export { crearFetchTolerante, type OpcionesFetchTolerante } from "./http-tolerante.ts";

export { candidatosDeDominio, candidatosDeUrl, dominioBase, extraerDominio } from "./dominio.ts";
export { leerMetadatos, type MetadatosDePagina } from "./metadatos.ts";
export { normalizar, palabrasClave, respaldoEnElCuerpo, similitudDeTitulos, tokens } from "./texto.ts";
