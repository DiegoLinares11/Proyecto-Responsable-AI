// ===========================================================================
// La portada en una pantalla ancha (la web, una tableta)
//
// Como un diario en línea: la principal grande a la izquierda, cuatro
// destacadas en rejilla a su lado, y abajo el resto en columnas, cada una con
// su foto o su ilustración. El espacio se usa para más noticias, no para
// márgenes vacíos. El orden y el «por qué está aquí» son los mismos que en el
// teléfono: cambia la disposición, no la jerarquía.
// ===========================================================================

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FotoDeNoticia } from '@/componentes/foto';
import { Abajo, Pin } from '@/componentes/iconos';
import { IlustracionTipografica } from '@/componentes/ilustracion';
import { Sello } from '@/componentes/sello';
import { ANCHOS, Espacio, Radio, ROTULO, Tipos, useColores, type Paleta } from '@/constants/tema';
import { haceCuanto, type NoticiaDelFeed } from '@/lib/noticias';
import type { NoticiaPersonalizada } from '@/lib/personalizacion';
import { porQue, type Razon } from '@/lib/porque';
import { nombreDeSeccion } from '@/lib/secciones';

type Item = NoticiaPersonalizada<NoticiaDelFeed>;

const MARGEN = 32;
const SEPARACION = 24;
const DESTACADAS = 4;

export function PortadaAncha({
  lista,
  anchoVentana,
  hoy,
  orden,
  ubicacion,
  cambiarUbicacion,
  abrir,
}: {
  lista: Item[];
  anchoVentana: number;
  hoy: string;
  orden: string;
  ubicacion: string;
  cambiarUbicacion: () => void;
  abrir: (id: string) => void;
}) {
  const c = useColores();
  const e = crearEstilos(c);

  // Las medidas salen del ancho real, no de porcentajes: así las columnas
  // quedan parejas en la web y en una tableta.
  const contenedor = Math.min(anchoVentana, ANCHOS.portada) - 2 * MARGEN;
  const anchoPrincipal = Math.round(contenedor * 0.52);
  const anchoLado = (contenedor - anchoPrincipal - SEPARACION - SEPARACION) / 2;
  const columnas = contenedor >= 1100 ? 4 : 3;
  const anchoTarjeta = (contenedor - SEPARACION * (columnas - 1)) / columnas;

  const [principal, ...resto] = lista;
  const destacadas = resto.slice(0, DESTACADAS);
  const demas = resto.slice(DESTACADAS);

  return (
    <View style={e.contenedor}>
      <View style={e.filaFecha}>
        <Text style={e.fecha}>{hoy}</Text>
        <View style={e.derecha}>
          <Text style={e.fecha}>{orden}</Text>
          <Pressable
            onPress={cambiarUbicacion}
            style={e.ubicacion}
            accessibilityRole="button"
            accessibilityLabel={`Ubicación simulada: ${ubicacion}. Tocá para cambiarla.`}>
            <Pin color={c.acento} />
            <Text style={e.ubicacionTexto}>{ubicacion}</Text>
            <Abajo color={c.tinta} />
          </Pressable>
        </View>
      </View>
      <View style={e.rayaGruesa} />
      <View style={e.rayaFina} />

      {principal ? (
        <View style={e.filaSuperior}>
          <Principal item={principal} ancho={anchoPrincipal} abrir={abrir} e={e} />
          <View style={[e.lado, { width: contenedor - anchoPrincipal - SEPARACION }]}>
            {destacadas.map((item) => (
              <Tarjeta key={item.noticia.id} item={item} ancho={anchoLado} abrir={abrir} e={e} />
            ))}
          </View>
        </View>
      ) : null}

      {demas.length > 0 ? (
        <>
          <View style={e.encabezado}>
            <Text style={e.encabezadoTexto}>MÁS TITULARES</Text>
          </View>
          <View style={e.rejilla}>
            {demas.map((item) => (
              <Tarjeta key={item.noticia.id} item={item} ancho={anchoTarjeta} abrir={abrir} e={e} />
            ))}
          </View>
        </>
      ) : null}

      <Text style={e.pie}>
        Sin esconder lo local, lo nacional ni lo internacional. Cada noticia dice por qué está donde está.
      </Text>
    </View>
  );
}

type Estilos = ReturnType<typeof crearEstilos>;

/** «SALUD · QUETZALTENANGO»: la sección y, si es local, la zona. */
function antetitulo(noticia: NoticiaDelFeed): string {
  const seccion = nombreDeSeccion(noticia.seccion);
  return (noticia.zona ? `${seccion} · ${noticia.zona}` : seccion).toUpperCase();
}

function PorQue({ razon, e }: { razon: Razon; e: Estilos }) {
  return (
    <Text style={[e.razon, razon.tono === 'zona' ? e.razonZona : razon.tono === 'cobertura' ? e.razonCobertura : null]}>
      {razon.texto}
    </Text>
  );
}

function Principal({ item, ancho, abrir, e }: { item: Item; ancho: number; abrir: (id: string) => void; e: Estilos }) {
  const n = item.noticia;
  return (
    <Pressable onPress={() => abrir(n.id)} style={[e.principal, { width: ancho }]} accessibilityRole="link">
      {n.imagen ? (
        <FotoDeNoticia imagen={n.imagen} estilo={e.imagenPrincipal} />
      ) : (
        <IlustracionTipografica seccion={nombreDeSeccion(n.seccion)} titulo={n.titulo} />
      )}
      <Text style={e.antetitulo}>{antetitulo(n)}</Text>
      <Text style={e.tituloPrincipal}>{n.titulo}</Text>
      <Text style={e.resumen} numberOfLines={4}>
        {n.resumen}
      </Text>
      <View style={e.meta}>
        <Sello puntaje={n.puntajeVeracidad} />
        <Text style={e.metaFuente}>{n.fuente ?? 'fuente no registrada'}</Text>
        <Text style={e.metaTexto}>{haceCuanto(n.publicadaEn)}</Text>
      </View>
      <PorQue razon={porQue(item)} e={e} />
    </Pressable>
  );
}

function Tarjeta({ item, ancho, abrir, e }: { item: Item; ancho: number; abrir: (id: string) => void; e: Estilos }) {
  const n = item.noticia;
  return (
    <Pressable onPress={() => abrir(n.id)} style={[e.tarjeta, { width: ancho }]} accessibilityRole="link">
      {n.imagen ? (
        <FotoDeNoticia imagen={n.imagen} estilo={e.imagenTarjeta} miniatura />
      ) : (
        <IlustracionTipografica seccion={nombreDeSeccion(n.seccion)} titulo={n.titulo} media />
      )}
      <Text style={e.antetitulo}>{antetitulo(n)}</Text>
      <Text style={e.tituloTarjeta} numberOfLines={4}>
        {n.titulo}
      </Text>
      <View style={e.meta}>
        <Sello puntaje={n.puntajeVeracidad} compacto />
        <Text style={e.metaFuente} numberOfLines={1}>
          {n.fuente ?? 'fuente no registrada'}
        </Text>
        <Text style={e.metaTexto}>{haceCuanto(n.publicadaEn)}</Text>
      </View>
      <PorQue razon={porQue(item)} e={e} />
    </Pressable>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    contenedor: {
      width: '100%',
      maxWidth: ANCHOS.portada,
      alignSelf: 'center',
      paddingHorizontal: MARGEN,
      paddingTop: Espacio.l,
      paddingBottom: Espacio.xxl,
    },
    filaFecha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    derecha: { flexDirection: 'row', alignItems: 'center', gap: Espacio.m },
    fecha: { fontFamily: Tipos.textoMedio, fontSize: 13, color: c.tintaSuave },
    ubicacion: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      borderRadius: Radio.medio,
      backgroundColor: c.papelHundido,
    },
    ubicacionTexto: { fontFamily: Tipos.textoMedio, fontSize: 13, color: c.tinta },
    rayaGruesa: { height: 3, backgroundColor: c.tinta },
    rayaFina: { height: 1, backgroundColor: c.tinta, marginTop: 2 },

    filaSuperior: {
      flexDirection: 'row',
      gap: SEPARACION,
      paddingTop: SEPARACION,
      paddingBottom: SEPARACION,
      borderBottomWidth: 1,
      borderBottomColor: c.borde,
    },
    principal: { gap: Espacio.s },
    imagenPrincipal: { width: '100%', aspectRatio: 16 / 10, borderRadius: Radio.chico, backgroundColor: c.fotoVacia },
    tituloPrincipal: { fontFamily: Tipos.titular, fontSize: 34, lineHeight: 39, color: c.tinta },
    resumen: { fontFamily: Tipos.lectura, fontSize: 18, lineHeight: 26, color: c.tintaSuave },
    lado: { flexDirection: 'row', flexWrap: 'wrap', gap: SEPARACION, alignContent: 'flex-start' },

    tarjeta: { gap: 6 },
    imagenTarjeta: { width: '100%', aspectRatio: 16 / 10, borderRadius: Radio.chico, backgroundColor: c.fotoVacia },
    tituloTarjeta: { fontFamily: Tipos.titular, fontSize: 18, lineHeight: 22, color: c.tinta },

    antetitulo: { ...ROTULO, color: c.acento, marginTop: 4 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    metaFuente: { fontFamily: Tipos.textoMedio, fontSize: 12, color: c.tinta, flexShrink: 1 },
    metaTexto: { fontFamily: Tipos.texto, fontSize: 12, color: c.tintaTenue },
    razon: { fontFamily: Tipos.texto, fontSize: 12, color: c.tintaTenue },
    razonZona: { fontFamily: Tipos.textoMedio, color: c.acento },
    razonCobertura: { fontFamily: Tipos.textoMedio, color: c.tintaSuave },

    encabezado: { marginTop: Espacio.xl, paddingBottom: 6, borderBottomWidth: 3, borderBottomColor: c.tinta, marginBottom: SEPARACION },
    encabezadoTexto: { ...ROTULO, color: c.tinta },
    rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: SEPARACION },

    pie: {
      fontFamily: Tipos.texto,
      fontSize: 12,
      color: c.tintaTenue,
      textAlign: 'center',
      marginTop: Espacio.xxl,
    },
  });
}
