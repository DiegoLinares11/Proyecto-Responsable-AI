// ===========================================================================
// De coordenadas a departamento, dentro del teléfono
//
// El GPS solo SUGIERE una ubicación; la personalización sigue dependiendo de la
// ubicación simulada que el usuario elige, como pide el enunciado («dependerá
// de esa ubicación y no del GPS»). En la demostración, compañeros en el mismo
// salón tienen que poder elegir ubicaciones distintas y comparar.
//
// Por qué no se usa la geocodificación inversa del sistema: le manda las
// coordenadas a Apple o a Google. Acá se comparan contra las cabeceras de los
// 22 departamentos, en el teléfono, y las coordenadas no salen de él ni se
// guardan. El precio es la precisión: es «la cabecera más cercana», que en los
// bordes de un departamento grande —Petén— se puede equivocar. Por eso es una
// sugerencia que el usuario confirma, no una asignación.
//
// Sin imports: lo prueba la suite del repositorio (tests/unit/personalizacion/).
// ===========================================================================

/** Cabeceras departamentales, aproximadas. El id es el de la tabla `ubicaciones`. */
export const CABECERAS: readonly { id: string; lat: number; lon: number }[] = [
  { id: 'GT-GU', lat: 14.6349, lon: -90.5069 }, // Ciudad de Guatemala
  { id: 'GT-AV', lat: 15.4708, lon: -90.3711 }, // Cobán
  { id: 'GT-BV', lat: 15.1036, lon: -90.3167 }, // Salamá
  { id: 'GT-CM', lat: 14.6611, lon: -90.8197 }, // Chimaltenango
  { id: 'GT-CQ', lat: 14.8, lon: -89.545 }, // Chiquimula
  { id: 'GT-PR', lat: 14.8539, lon: -90.0686 }, // Guastatoya
  { id: 'GT-ES', lat: 14.305, lon: -90.785 }, // Escuintla
  { id: 'GT-HU', lat: 15.3194, lon: -91.4708 }, // Huehuetenango
  { id: 'GT-IZ', lat: 15.7278, lon: -88.5944 }, // Puerto Barrios
  { id: 'GT-JA', lat: 14.6333, lon: -89.9833 }, // Jalapa
  { id: 'GT-JU', lat: 14.2917, lon: -89.8958 }, // Jutiapa
  { id: 'GT-PE', lat: 16.93, lon: -89.892 }, // Flores
  { id: 'GT-QZ', lat: 14.8347, lon: -91.5181 }, // Quetzaltenango
  { id: 'GT-QC', lat: 15.0306, lon: -91.1489 }, // Santa Cruz del Quiché
  { id: 'GT-RE', lat: 14.5333, lon: -91.6833 }, // Retalhuleu
  { id: 'GT-SA', lat: 14.5586, lon: -90.7339 }, // Antigua Guatemala
  { id: 'GT-SM', lat: 14.9661, lon: -91.7944 }, // San Marcos
  { id: 'GT-SR', lat: 14.2797, lon: -90.2989 }, // Cuilapa
  { id: 'GT-SO', lat: 14.7731, lon: -91.1831 }, // Sololá
  { id: 'GT-SU', lat: 14.5342, lon: -91.5033 }, // Mazatenango
  { id: 'GT-TO', lat: 14.9108, lon: -91.3611 }, // Totonicapán
  { id: 'GT-ZA', lat: 14.9722, lon: -89.5306 }, // Zacapa
];

/** El recuadro que contiene a Guatemala. Fuera de él no se sugiere nada. */
const GUATEMALA = { latMin: 13.7, latMax: 17.85, lonMin: -92.25, lonMax: -88.2 };

/** Distancia en kilómetros sobre la esfera (Haversine). */
export function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/**
 * El departamento cuya cabecera está más cerca, o null si las coordenadas
 * caen fuera de Guatemala. No adivina países: fuera del recuadro, el usuario
 * elige de la lista.
 */
export function departamentoMasCercano(lat: number, lon: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < GUATEMALA.latMin || lat > GUATEMALA.latMax || lon < GUATEMALA.lonMin || lon > GUATEMALA.lonMax) {
    return null;
  }

  let mejor = CABECERAS[0]!;
  let menor = Number.POSITIVE_INFINITY;
  for (const c of CABECERAS) {
    const d = distanciaKm(lat, lon, c.lat, c.lon);
    if (d < menor) {
      menor = d;
      mejor = c;
    }
  }
  return mejor.id;
}
