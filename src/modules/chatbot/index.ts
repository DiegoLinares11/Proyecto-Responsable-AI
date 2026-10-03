// ===========================================================================
// Fase 4 — Chatbot con defensa en profundidad
//
// Superficie pública del módulo. Este es el ÚNICO módulo del proyecto que puede
// llamar a un modelo de lenguaje (docs/arquitectura.md): cualquier otro que
// quisiera usarlo tendría que justificarse en un ADR, porque estaría gastando
// presupuesto que ya está asignado.
// ===========================================================================

export {
  MAXIMO_DE_CARACTERES,
  NEGATIVA_CONTENIDO_DANINO,
  NEGATIVA_FUERA_DE_DOMINIO,
  RESPUESTA_DE_CORTESIA,
  NOTICIAS_EN_CONTEXTO,
  type CapaQueCorto,
  type CategoriaDeIntencion,
  type ContarMensajesDeHoy,
  type CostoDelTurno,
  type GuardarTurno,
  type NivelDeConfianza,
  type NoticiaParaElModelo,
  type RecuperarNoticias,
  type RespuestaDelModelo,
  type ResultadoDeConversacion,
  type Sospecha,
  type TurnoRegistrado,
  type VerificarNoticias,
  type VeredictoCapa0,
  type VeredictoCapa1,
  type VeredictoCapa3,
} from "./tipos.ts";

export { filtrarEntrada, CLAVES_DE_PATRON, type OpcionesCapa0 } from "./capa0-filtro.ts";

export {
  revisarSalida,
  huellasDelSistema,
  RESPUESTA_BLOQUEADA_POR_GUARDIA,
  type EntradaCapa3,
} from "./capa3-guardia.ts";

export {
  delimitarAcervo,
  marcaDeAcervo,
  recordatorioDeTurno,
  ESQUEMA_DE_CLASIFICACION,
  ESQUEMA_DE_RESPUESTA,
  PROMPT_DEL_CLASIFICADOR,
  PROMPT_DEL_SISTEMA,
  RECORDATORIO_DE_TURNO,
} from "./prompt.ts";

export {
  conversar,
  type DependenciasDelChatbot,
  type PeticionDeConversacion,
} from "./conversar.ts";

export {
  calcularCosto,
  sumarCostos,
  ConfiguracionInvalida,
  COSTO_CERO,
  PRECIOS_POR_MILLON,
  type ModoLlm,
  type PeticionDeClasificacion,
  type PeticionDeRespuesta,
  type ProveedorLlm,
  type Respondido,
  type TurnoDeHistorial,
} from "./proveedor/tipos.ts";
