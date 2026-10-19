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
import { ReservaDeImagen } from '@/componentes/reserva-de-imagen';
import { DatoEditorial } from '@/componentes/dato-editorial';
import { AperturaTipografica } from '@/componentes/apertura-tipografica';
import { MesaDeContexto } from '@/componentes/mesa-de-contexto';
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
const SEPARACION = 32;
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
      {n.imagen ? (
        <FotoDeNoticia imagen={n.imagen} estilo={e.imagenPrincipal} />
      ) : <ReservaDeImagen estilo={e.imagenPrincipal} />}
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
      <View style={e.meta}>
        <Sello puntaje={n.puntajeVeracidad} enDesarrollo={n.enDesarrollo} />
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
      {!lateral ? (
        n.imagen
          ? <FotoDeNoticia imagen={n.imagen} estilo={e.imagenTarjeta} miniatura />
          : <ReservaDeImagen estilo={e.imagenTarjeta} />
      ) : null}
      <View style={e.filaTitular}>
        {lateral ? (
          n.imagen
            ? <FotoDeNoticia imagen={n.imagen} estilo={e.miniaturaLateral} miniatura />
            : <ReservaDeImagen estilo={e.miniaturaLateral} miniatura />
        ) : null}
        <View style={e.textoTitular}>
          <Text style={e.antetitulo}>{antetitulo(n)}</Text>
          <Text style={e.tituloTarjeta}>{n.titulo}</Text>
        </View>
      </View>
      <Text style={e.resumenTarjeta} numberOfLines={3}>{n.resumen}</Text>
      <View style={e.meta}>
        <Sello puntaje={n.puntajeVeracidad} compacto enDesarrollo={n.enDesarrollo} />
        <DatoEditorial tipo="fuente" texto={n.fuente ?? 'Fuente no registrada'} />
        <DatoEditorial tipo="fecha" texto={haceCuanto(n.publicadaEn)} />
      </View>
      <PorQue razon={porQue(item)} />
    </EnlaceDeNoticia>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    contenedor: { width: '100%', maxWidth: ANCHOS.portada, alignSelf: 'center', paddingHorizontal: MARGEN, paddingTop: Espacio.xl, paddingBottom: 48 },
    filaFecha: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Espacio.l },
    apertura: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: Espacio.xl, paddingTop: Espacio.l, paddingBottom: Espacio.l },
    presentacion: { gap: Espacio.s },
    tituloPortada: { fontFamily: Tipos.titular, fontSize: 32, lineHeight: 40, letterSpacing: -0.8, color: c.tinta },
    bajada: { fontFamily: Tipos.texto, fontSize: 15, lineHeight: 24, color: c.tintaSuave },
    derecha: { alignItems: 'flex-end', gap: Espacio.s },
    fecha: { fontFamily: Tipos.texto, fontSize: 12, lineHeight: 19, color: c.tintaSuave },
    ubicacion: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: c.borde, borderRadius: Radio.medio, backgroundColor: c.papelHundido },
    ubicacionTexto: { fontFamily: Tipos.textoMedio, fontSize: 13, lineHeight: 20, color: c.tinta },
    rayaFina: { height: 1, backgroundColor: c.borde },
    filaSuperior: { flexDirection: 'row', flexWrap: 'wrap', gap: SEPARACION, paddingTop: Espacio.xl, paddingBottom: Espacio.xl, borderBottomWidth: 1, borderBottomColor: c.borde },
    principal: { gap: Espacio.m },
    aperturaNota: { gap: Espacio.m, paddingBottom: Espacio.s },
    contexto: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Espacio.l },
    imagenPrincipal: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radio.chico, backgroundColor: c.fotoVacia },
    tituloPrincipal: { fontFamily: Tipos.titular, fontSize: 36, lineHeight: 44, letterSpacing: -0.7, color: c.tinta },
    resumen: { fontFamily: Tipos.lectura, fontSize: 17, lineHeight: 27, color: c.tintaSuave },
    lado: { flexDirection: 'row', flexWrap: 'wrap', gap: SEPARACION, alignContent: 'flex-start' },
    tarjeta: { gap: Espacio.s, paddingBottom: Espacio.l, borderBottomWidth: 1, borderBottomColor: c.borde },
    tarjetaLateral: { paddingTop: 4 },
    filaTitular: { flexDirection: 'row', gap: Espacio.m, alignItems: 'flex-start' },
    textoTitular: { flex: 1, minWidth: 0, gap: 6 },
    miniaturaLateral: { width: 100, height: 100, backgroundColor: c.fotoVacia, borderRadius: Radio.chico },
    imagenTarjeta: { width: '100%', aspectRatio: 16 / 10, borderRadius: Radio.chico, backgroundColor: c.fotoVacia },
    tituloTarjeta: { fontFamily: Tipos.titular, fontSize: 21, lineHeight: 28, letterSpacing: -0.4, color: c.tinta },
    resumenTarjeta: { fontFamily: Tipos.lectura, fontSize: 15, lineHeight: 23, color: c.tintaSuave },
    antetitulo: { ...ROTULO, fontSize: 11, lineHeight: 17, letterSpacing: 0.5, color: c.acento },
    meta: { flexDirection: 'row', alignItems: 'center', columnGap: 10, rowGap: 4, flexWrap: 'wrap' },
    encabezado: { marginTop: Espacio.xxl, paddingBottom: Espacio.m, borderBottomWidth: 1, borderBottomColor: c.borde, marginBottom: SEPARACION },
    encabezadoTexto: { ...ROTULO, color: c.tinta },
    rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: SEPARACION },
    pie: { fontFamily: Tipos.texto, fontSize: 15, lineHeight: 24, color: c.tintaTenue, textAlign: 'center' },
  });
}
