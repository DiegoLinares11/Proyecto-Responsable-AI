// ===========================================================================
// La portada en una pantalla ancha (la web, una tableta)
//
// Una apertura editorial y dos noticias al lado. Las demás siguen en columnas.
// Sin foto, la noticia se compone como una pieza tipográfica: el titular se
// muestra una sola vez. El orden personal se conserva al recorrer la página.
// ===========================================================================

import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { FotoDeNoticia } from '@/componentes/foto';
import { DatoEditorial } from '@/componentes/dato-editorial';
import { AperturaTipografica } from '@/componentes/apertura-tipografica';
import { MesaDeContexto } from '@/componentes/mesa-de-contexto';
import { GestoDeSeccion } from '@/componentes/gesto-de-seccion';
import { EnlaceDeNoticia } from '@/componentes/enlace-de-noticia';
import { Abajo, Pin } from '@/componentes/iconos';
import { SelectorDeApariencia } from '@/componentes/selector-de-apariencia';
import { Sello } from '@/componentes/sello';
import { ANCHOS, Espacio, Radio, ROTULO, Tipos, useColores, type Paleta } from '@/constants/tema';
import { haceCuanto, type NoticiaDelFeed } from '@/lib/noticias';
import type { NoticiaPersonalizada } from '@/lib/personalizacion';
import { porQue, type Razon } from '@/lib/porque';
import { nombreDeSeccion } from '@/lib/secciones';

type Item = NoticiaPersonalizada<NoticiaDelFeed>;

const MARGEN = 32;
const SEPARACION = 40;
const DESTACADAS = 2;

export function PortadaAncha({
  lista,
  indice,
  cierre,
  anchoVentana,
  hoy,
  orden,
  ubicacion,
  cambiarUbicacion,
  abrir,
}: {
  lista: Item[];
  indice: ReactNode;
  cierre: ReactNode;
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
  const compacta = contenedor < 1100;
  const anchoPrincipal = compacta ? contenedor : Math.round(contenedor * 0.6);
  const anchoDestacadas = compacta ? contenedor : contenedor - anchoPrincipal - SEPARACION;
  const anchoLado = compacta ? (anchoDestacadas - SEPARACION) / 2 : anchoDestacadas;
  const columnas = 3;
  const anchoTarjeta = (contenedor - SEPARACION * (columnas - 1)) / columnas;

  const [principal, ...resto] = lista;
  const destacadas = resto.slice(0, DESTACADAS);
  const demas = resto.slice(DESTACADAS);

  return (
    <View style={e.contenedor}>
      <View style={e.filaFecha}>
        <DatoEditorial tipo="fecha" texto={hoy} />
        <SelectorDeApariencia />
      </View>
      <View style={e.apertura}>
        <View style={e.presentacion}>
          <Text style={e.tituloPortada} accessibilityRole="header">La portada</Text>
          <Text style={e.bajada}>Noticias para leer con perspectiva.</Text>
        </View>
        <View style={e.derecha}>
          <Text style={e.fecha}>{orden}</Text>
          <Pressable
            onPress={cambiarUbicacion}
            style={({ pressed }) => [e.ubicacion, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`Ubicación simulada: ${ubicacion}. Tocá para cambiarla.`}>
            <Pin color={c.acento} />
            <Text style={e.ubicacionTexto}>{ubicacion}</Text>
            <Abajo color={c.tinta} />
          </Pressable>
        </View>
      </View>
      <View style={e.rayaFina} />
      {indice}

      {principal ? (
        <View style={e.filaSuperior}>
          <Principal item={principal} ancho={anchoPrincipal} abrir={abrir} e={e} />
          <View style={[e.lado, { width: anchoDestacadas }]}>
            {destacadas.map((item) => (
              <Tarjeta key={item.noticia.id} item={item} ancho={anchoLado} abrir={abrir} e={e} lateral />
            ))}
          </View>
        </View>
      ) : null}

      {principal ? <View style={{ marginTop: Espacio.xl }}><MesaDeContexto /></View> : (
        <Text style={[e.pie, { paddingVertical: 48 }]}>No hay noticias disponibles en esta sección.</Text>
      )}

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

      <View style={{ marginTop: Espacio.xxl }}>{cierre}</View>
    </View>
  );
}

type Estilos = ReturnType<typeof crearEstilos>;

/** La sección tiene su propia jerarquía; la ubicación lleva icono y texto. */
function antetitulo(noticia: NoticiaDelFeed): string {
  const seccion = nombreDeSeccion(noticia.seccion);
  return seccion.toUpperCase();
}

function PorQue({ razon }: { razon: Razon }) {
  return (
    <DatoEditorial tipo={razon.tono === 'zona' ? 'zona' : 'contexto'} texto={razon.texto} destacado={razon.tono === 'zona'} />
  );
}

function Principal({ item, ancho, abrir, e }: { item: Item; ancho: number; abrir: (id: string) => void; e: Estilos }) {
  const n = item.noticia;
  return (
    <EnlaceDeNoticia onPress={() => abrir(n.id)} style={[e.principal, { width: ancho }]}>
      {!n.imagen ? <AperturaTipografica noticia={n} ancha /> : (
        <View style={e.aperturaNota}>
          <View style={e.contexto}>
            <Text style={e.antetitulo}>{antetitulo(n)}</Text>
            {n.zona ? <DatoEditorial tipo="zona" texto={n.zona} /> : null}
          </View>
          <Text style={e.tituloPrincipal}>{n.titulo}</Text>
          <Text style={e.resumen}>{n.resumen}</Text>
        </View>
      )}
      {n.imagen ? (
        <FotoDeNoticia imagen={n.imagen} estilo={e.imagenPrincipal} />
      ) : null}
      <View style={e.meta}>
        <Sello puntaje={n.puntajeVeracidad} />
        <DatoEditorial tipo="fuente" texto={n.fuente ?? 'Fuente no registrada'} />
        <DatoEditorial tipo="fecha" texto={haceCuanto(n.publicadaEn)} />
      </View>
      <PorQue razon={porQue(item)} />
    </EnlaceDeNoticia>
  );
}

function Tarjeta({ item, ancho, abrir, e, lateral = false }: { item: Item; ancho: number; abrir: (id: string) => void; e: Estilos; lateral?: boolean }) {
  const n = item.noticia;
  return (
    <EnlaceDeNoticia onPress={() => abrir(n.id)} style={[e.tarjeta, lateral && e.tarjetaLateral, { width: ancho }]}>
      {n.imagen && !lateral ? (
        <FotoDeNoticia imagen={n.imagen} estilo={e.imagenTarjeta} miniatura />
      ) : null}
      {!n.imagen ? <GestoDeSeccion seccion={n.seccion} tamano={48} /> : null}
      <Text style={e.antetitulo}>{antetitulo(n)}</Text>
      <View style={e.filaTitular}>
        <Text style={[e.tituloTarjeta, { flex: 1 }]}>{n.titulo}</Text>
        {n.imagen && lateral ? <FotoDeNoticia imagen={n.imagen} estilo={e.miniaturaLateral} miniatura /> : null}
      </View>
      <Text style={e.resumenTarjeta} numberOfLines={3}>{n.resumen}</Text>
      <View style={e.meta}>
        <Sello puntaje={n.puntajeVeracidad} compacto />
        <DatoEditorial tipo="fuente" texto={n.fuente ?? 'Fuente no registrada'} />
        <DatoEditorial tipo="fecha" texto={haceCuanto(n.publicadaEn)} />
      </View>
      <PorQue razon={porQue(item)} />
    </EnlaceDeNoticia>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    contenedor: {
      width: '100%',
      maxWidth: ANCHOS.portada,
      alignSelf: 'center',
      paddingHorizontal: MARGEN,
      paddingTop: Espacio.xl,
      paddingBottom: Espacio.xxl,
    },
    filaFecha: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Espacio.l },
    apertura: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: Espacio.xl, paddingTop: 36, paddingBottom: 28 },
    presentacion: { gap: Espacio.s },
    tituloPortada: { fontFamily: Tipos.lectura, fontSize: 64, lineHeight: 70, letterSpacing: -2, color: c.tinta },
    bajada: { fontFamily: Tipos.texto, fontSize: 15, lineHeight: 23, color: c.tintaSuave },
    derecha: { alignItems: 'flex-end', gap: Espacio.s },
    fecha: { fontFamily: Tipos.textoMedio, fontSize: 13, color: c.tintaSuave },
    ubicacion: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      borderRadius: Radio.medio,
      backgroundColor: c.papelHundido,
    },
    ubicacionTexto: { fontFamily: Tipos.textoMedio, fontSize: 13, color: c.tinta },
    rayaFina: { height: 1, backgroundColor: c.bordeFuerte },

    filaSuperior: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SEPARACION,
      paddingTop: SEPARACION,
      paddingBottom: SEPARACION,
      borderBottomWidth: 1,
      borderBottomColor: c.borde,
    },
    principal: { gap: Espacio.l },
    aperturaNota: { gap: Espacio.xl, paddingBottom: Espacio.s },
    contexto: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Espacio.l },
    imagenPrincipal: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radio.chico, backgroundColor: c.fotoVacia },
    tituloPrincipal: { fontFamily: Tipos.titular, fontSize: 46, lineHeight: 51, letterSpacing: -0.5, color: c.tinta },
    resumen: { fontFamily: Tipos.lectura, fontSize: 21, lineHeight: 30, color: c.tintaSuave },
    lado: { flexDirection: 'row', flexWrap: 'wrap', gap: SEPARACION, alignContent: 'flex-start' },

    tarjeta: { gap: Espacio.m, paddingBottom: Espacio.xl },
    tarjetaLateral: { borderBottomWidth: 1, borderBottomColor: c.borde },
    filaTitular: { flexDirection: 'row', gap: Espacio.l, alignItems: 'flex-start' },
    miniaturaLateral: { width: 100, height: 84, backgroundColor: c.fotoVacia, borderRadius: Radio.chico },
    imagenTarjeta: { width: '100%', aspectRatio: 2 / 1, borderRadius: Radio.chico, backgroundColor: c.fotoVacia },
    tituloTarjeta: { fontFamily: Tipos.titular, fontSize: 25, lineHeight: 30, color: c.tinta },
    resumenTarjeta: { fontFamily: Tipos.lectura, fontSize: 17, lineHeight: 25, color: c.tintaSuave },

    antetitulo: { ...ROTULO, color: c.acento, marginTop: 4 },
    meta: { flexDirection: 'row', alignItems: 'center', columnGap: 14, rowGap: 8, flexWrap: 'wrap' },

    encabezado: { marginTop: Espacio.xl, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.bordeFuerte, marginBottom: SEPARACION },
    encabezadoTexto: { ...ROTULO, color: c.tinta },
    rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: SEPARACION },

    pie: {
      fontFamily: Tipos.texto,
      fontSize: 14,
      color: c.tintaTenue,
      textAlign: 'center',
    },
  });
}
