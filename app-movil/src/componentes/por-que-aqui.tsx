// ===========================================================================
// «¿Por qué está en tu portada?», con los números
//
// La línea corta de la portada («De tu zona · Quetzaltenango») dice el motivo;
// acá están los números que lo sostienen. La relevancia global —la misma para
// todos— y los dos factores que la vuelven tuya. Un orden que no se puede
// explicar es lo que este curso enseña a no construir (ADR 0003); la forma de
// no construirlo es mostrarlo.
// ===========================================================================

import { StyleSheet, Text, View } from 'react-native';

import { Espacio, Radio, ROTULO, Tipos, useColores, type Paleta } from '@/constants/tema';
import type { NoticiaDelFeed } from '@/lib/noticias';
import { factorDeInteres, factorGeografico, type MotivoGeografico } from '@/lib/personalizacion';
import { usePreferencias } from '@/lib/preferencias';
import { nombreDeSeccion } from '@/lib/secciones';

const COMPONENTES: readonly (readonly [keyof NoticiaDelFeed['componentes'], string, string])[] = [
  ['interacciones', 'Interacciones', 'Reacciones, comentarios y lecturas, ponderadas por la antigüedad de cada cuenta.'],
  ['verificadas', 'Cuentas verificadas', 'Una fuente acreditada pesa más que una cuenta recién creada.'],
  ['fuente', 'Credibilidad de la fuente', 'Lo que dice el registro de fuentes sobre el medio.'],
  ['veracidad', 'Veracidad', 'El puntaje del canal de validación, al cuadrado: raspar el umbral no vale lo mismo que estar corroborado.'],
];

function motivo(m: MotivoGeografico, zona: string): string {
  return {
    tu_zona: `De tu zona (${zona})`,
    otra_zona: 'Local de otra zona',
    tu_pais: 'Nacional, de tu país',
    otro_pais: 'De otro país',
    internacional: 'Internacional',
  }[m];
}

const numero = (x: number, decimales = 2) => x.toFixed(decimales);

export function PorQueEnTuPortada({ noticia }: { noticia: NoticiaDelFeed }) {
  const c = useColores();
  const e = crearEstilos(c);
  const { ubicacion, lecturas } = usePreferencias();

  const geo = factorGeografico(noticia, ubicacion);
  const interes = factorDeInteres(noticia.seccion, lecturas);
  const personal = noticia.relevancia * geo.valor * interes.valor;
  const seccion = nombreDeSeccion(noticia.seccion);

  return (
    <View style={e.caja} accessibilityLabel="Por qué está en tu portada">
      <Text style={e.titulo}>POR QUÉ ESTÁ EN TU PORTADA</Text>

      <View style={e.fila}>
        <Text style={e.nombre}>Relevancia global</Text>
        <Text style={e.valorFuerte}>{numero(noticia.relevancia, 3)}</Text>
      </View>
      <Text style={e.explicacion}>
        La misma para todos: la suma de cuatro componentes, dividida por la antigüedad de la nota.
      </Text>
      {COMPONENTES.map(([clave, nombre, explicacion]) => (
        <View key={clave} style={e.componente}>
          <View style={e.fila}>
            <Text style={e.nombreChico}>{nombre}</Text>
            <Text style={e.valor}>+{numero(noticia.componentes[clave])}</Text>
          </View>
          <Text style={e.explicacion}>{explicacion}</Text>
        </View>
      ))}

      <View style={e.separador} />

      <View style={e.fila}>
        <Text style={e.nombre}>Tu ubicación</Text>
        <Text style={e.valor}>×{numero(geo.valor, 1)}</Text>
      </View>
      <Text style={e.explicacion}>{motivo(geo.motivo, ubicacion.nombre)}.</Text>

      <View style={e.fila}>
        <Text style={e.nombre}>Tu interés en {seccion}</Text>
        <Text style={e.valor}>×{numero(interes.valor)}</Text>
      </View>
      <Text style={e.explicacion}>
        {interes.total === 0
          ? 'Sin lecturas todavía: todas las secciones pesan lo mismo.'
          : `Abriste ${interes.lecturas} de ${interes.total} notas de ${seccion} en los últimos 30 días.`}
      </Text>

      <View style={[e.fila, e.total]}>
        <Text style={e.nombre}>Relevancia para vos</Text>
        <Text style={e.valorFuerte}>{numero(personal, 3)}</Text>
      </View>
      <Text style={e.explicacion}>
        Global × ubicación × interés. Además, ninguna preferencia saca de arriba lo más importante del día
        ni deja la portada sin algo local, nacional e internacional.
      </Text>
    </View>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    caja: {
      backgroundColor: c.papelHundido,
      borderRadius: Radio.medio,
      padding: Espacio.l,
      borderWidth: 1,
      borderColor: c.borde,
      gap: Espacio.s,
    },
    titulo: { ...ROTULO, color: c.tinta, marginBottom: 4 },
    fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: Espacio.s },
    nombre: { fontFamily: Tipos.textoMedio, fontSize: 14, color: c.tinta, flex: 1 },
    nombreChico: { fontFamily: Tipos.texto, fontSize: 13, color: c.tinta, flex: 1 },
    valor: { fontFamily: Tipos.numeros, fontSize: 13, color: c.tinta },
    valorFuerte: { fontFamily: Tipos.numeros, fontSize: 16, color: c.verificado },
    componente: { paddingLeft: Espacio.m, gap: 2 },
    explicacion: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 23, color: c.tintaSuave },
    separador: { height: 1, backgroundColor: c.borde, marginVertical: 4 },
    total: { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.bordeFuerte },
  });
}
