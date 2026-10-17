// ===========================================================================
// La portada
//
// Tres tamaños de tarjeta según la posición en el ranking: la principal, las
// destacadas y los titulares. El enunciado pide que el feed no sea una lista
// indiferenciada y da a Marca como referencia: la jerarquía es lo que deja
// leer una portada en diagonal.
//
// El orden es PERSONAL: la relevancia global de la Fase 3 multiplicada por la
// ubicación simulada y por lo que el usuario lee, con cupos que garantizan lo
// local, lo nacional y lo internacional arriba (lib/personalizacion.ts). Y cada
// tarjeta dice por qué está donde está: un orden que no se puede explicar es
// lo que este curso enseña a no construir.
// ===========================================================================

import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AreaDePestana } from '@/componentes/area-de-pestana';

import { FotoDeNoticia } from '@/componentes/foto';
import { DatoEditorial } from '@/componentes/dato-editorial';
import { AperturaTipografica } from '@/componentes/apertura-tipografica';
import { IndiceDeSecciones } from '@/componentes/indice-de-secciones';
import { MesaDeContexto } from '@/componentes/mesa-de-contexto';
import { CierreDeEdicion } from '@/componentes/cierre-de-edicion';
import { GestoDeSeccion } from '@/componentes/gesto-de-seccion';
import { MenuEditorial } from '@/componentes/menu-editorial';
import { EnlaceDeNoticia } from '@/componentes/enlace-de-noticia';
import { Abajo, Pin } from '@/componentes/iconos';
import { Logotipo } from '@/componentes/marca';
import { PortadaAncha } from '@/componentes/portada-ancha';
import { Sello } from '@/componentes/sello';
import { SelectorDeUbicacion } from '@/componentes/selector-de-ubicacion';
import { Espacio, Radio, ROTULO, Tipos, useColores, useDisposicion, type Paleta } from '@/constants/tema';
import { useHidratado } from '@/lib/hidratacion';
import { haceCuanto, leerFeed, type NoticiaDelFeed } from '@/lib/noticias';
import { personalizar } from '@/lib/personalizacion';
import { porQue, type Razon } from '@/lib/porque';
import { usePreferencias } from '@/lib/preferencias';
import { nombreDeSeccion } from '@/lib/secciones';


const DESTACADAS = 4;

export default function Portada() {
  const c = useColores();
  const e = crearEstilos(c);
  const [noticias, setNoticias] = useState<NoticiaDelFeed[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [eligiendo, setEligiendo] = useState(false);
  const [seccion, setSeccion] = useState<string | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<number | null>(null);
  const { ubicacion, lecturas } = usePreferencias();
  const { ancha, anchoVentana } = useDisposicion();

  // Se recalcula en el teléfono cada vez que cambia la ubicación o una lectura:
  // es aritmética sobre unas decenas de noticias, no una llamada.
  const lista = useMemo(
    () => (noticias === null ? null : personalizar(noticias, ubicacion, lecturas)),
    [noticias, ubicacion, lecturas],
  );
  const visible = useMemo(
    () => seccion === null ? lista : lista?.filter(item => item.noticia.seccion === seccion) ?? null,
    [lista, seccion],
  );
  const indice = noticias && noticias.length > 0 ? (
    <IndiceDeSecciones noticias={noticias} elegida={seccion} cambiar={setSeccion} />
  ) : null;

  const cargar = useCallback(async () => {
    try {
      const leidas = await leerFeed();
      setNoticias(leidas);
      setActualizadoEn(Date.now());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // La primera carga: el estado se toca solo cuando llega la respuesta, y no si
  // la pantalla ya se desmontó.
  useEffect(() => {
    let vigente = true;
    leerFeed()
      .then((leidas) => {
        if (vigente) { setNoticias(leidas); setActualizadoEn(Date.now()); }
      })
      .catch((err) => {
        if (vigente) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      vigente = false;
    };
  }, []);

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  const abrir = (id: string) => router.push({ pathname: '/noticia/[id]', params: { id } });

  // Solo la primera letra en mayúscula: «Sábado, 3 de octubre», no «3 De Octubre».
  // En la web, la portada se genera al compilar, en el reloj (UTC) del servidor
  // de Vercel: pasadas las 18:00 en Guatemala ya es el día siguiente allá. La
  // fecha se calcula recién con el reloj del navegador; antes, un espacio que no
  // mueve la línea. En el teléfono no hay HTML previo y sale de una vez.
  const hidratado = useHidratado();
  const fecha = new Date().toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' });
  const hoy = hidratado ? fecha.charAt(0).toUpperCase() + fecha.slice(1) : ' ';
  const orden = lecturas.length > 0 ? 'Para tu zona y lo que leés' : 'Ordenada para tu zona';
  const cierre = visible && visible.length > 0 ? <CierreDeEdicion cantidad={visible.length} actualizadoEn={actualizadoEn} actualizar={refrescar} cargando={refrescando} filtrada={seccion !== null} error={error} /> : null;

  // En una pantalla ancha, la disposición de un diario en línea; el orden y las
  // razones son los mismos (src/componentes/portada-ancha.tsx).
  if (ancha) {
    return (
      <AreaDePestana style={e.pantalla}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.acento} />}>
          {error && lista === null ? (
            <Text style={e.error}>{error}</Text>
          ) : lista === null ? (
            <ActivityIndicator style={{ marginTop: 48 }} color={c.acento} />
          ) : lista.length === 0 ? (
            <Text style={e.vacio}>Todavía no hay noticias verificadas.</Text>
          ) : (
            <PortadaAncha
              lista={visible ?? []}
              indice={indice}
              cierre={cierre}
              anchoVentana={anchoVentana}
              hoy={hoy}
              orden={orden}
              ubicacion={ubicacion.nombre}
              cambiarUbicacion={() => setEligiendo(true)}
              abrir={abrir}
            />
          )}
        </ScrollView>
        <SelectorDeUbicacion visible={eligiendo} cerrar={() => setEligiendo(false)} />
      </AreaDePestana>
    );
  }

  return (
    <AreaDePestana style={e.pantalla}>
      <FlatList
        data={visible ?? []}
        keyExtractor={(n) => n.noticia.id}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.acento} />}
        ListHeaderComponent={
          <View style={e.cabecera}>
            <View style={e.filaMarca}>
              <Logotipo />
              {Platform.OS !== 'web' ? <MenuEditorial /> : null}
              <Pressable
                onPress={() => setEligiendo(true)}
                style={e.ubicacion}
                accessibilityRole="button"
                accessibilityLabel={`Ubicación simulada: ${ubicacion.nombre}. Tocá para cambiarla.`}>
                <Pin color={c.acento} />
                <Text style={e.ubicacionTexto} numberOfLines={1}>
                  {ubicacion.nombre}
                </Text>
                <Abajo color={c.tinta} />
              </Pressable>
            </View>
            <View style={e.filaFecha}>
              <DatoEditorial tipo="fecha" texto={hoy} />
              <Text style={e.fecha}>{orden}</Text>
            </View>
            <Text style={e.tituloPortada} accessibilityRole="header">La portada</Text>
            <View style={e.rayaFina} />
            {indice}
          </View>
        }
        ListEmptyComponent={
          error ? (
            <Text style={e.error}>{error}</Text>
          ) : lista === null ? (
            <ActivityIndicator style={{ marginTop: 48 }} color={c.acento} />
          ) : (
            <Text style={e.vacio}>{seccion === null ? 'Todavía no hay noticias verificadas.' : 'No hay noticias disponibles en esta sección.'}</Text>
          )
        }
        ListFooterComponent={
          <View style={{ margin: Espacio.xl }}>{cierre}</View>
        }
        renderItem={({ item, index }) => {
          const props = { noticia: item.noticia, razon: porQue(item), e, onPress: () => abrir(item.noticia.id) };
          return (
            <View>
              {index === 0 ? <Principal {...props} /> : index <= DESTACADAS ? <Destacada {...props} /> : <Titular {...props} primero={index === DESTACADAS + 1} />}
              {index === Math.min(2, (visible?.length ?? 1) - 1) ? (
                <View style={{ marginHorizontal: Espacio.xl, marginBottom: Espacio.xxl }}><MesaDeContexto /></View>
              ) : null}
            </View>
          );
        }}
      />
      {/* Fuera de FlatList: el modal no debe heredar su contexto de lista anidada. */}
      <SelectorDeUbicacion visible={eligiendo} cerrar={() => setEligiendo(false)} />
    </AreaDePestana>
  );
}

type PropsDeTarjeta = {
  noticia: NoticiaDelFeed;
  razon: Razon;
  e: ReturnType<typeof crearEstilos>;
  onPress: () => void;
};

/** La sección tiene su propia jerarquía; la ubicación lleva icono y texto. */
function antetitulo(noticia: NoticiaDelFeed): string {
  const seccion = nombreDeSeccion(noticia.seccion);
  return seccion.toUpperCase();
}

/** La línea de «por qué está aquí». */
function PorQue({ razon }: { razon: Razon }) {
  return (
    <DatoEditorial tipo={razon.tono === 'zona' ? 'zona' : 'contexto'} texto={razon.texto} destacado={razon.tono === 'zona'} />
  );
}

function Meta({ noticia, e, compacta = false }: Pick<PropsDeTarjeta, 'noticia' | 'e'> & { compacta?: boolean }) {
  return (
    <View style={e.meta}>
      <Sello puntaje={noticia.puntajeVeracidad} compacto={compacta} enDesarrollo={noticia.enDesarrollo} />
      <DatoEditorial tipo="fuente" texto={noticia.fuente ?? 'Fuente no registrada'} />
      <DatoEditorial tipo="fecha" texto={haceCuanto(noticia.publicadaEn)} />
    </View>
  );
}

function Principal({ noticia, razon, e, onPress }: PropsDeTarjeta) {
  return (
    <EnlaceDeNoticia onPress={onPress} style={e.principal}>
      {!noticia.imagen ? (
        <View style={{ marginBottom: Espacio.l }}><AperturaTipografica noticia={noticia} /></View>
      ) : (
        <View style={e.cuerpoPrincipal}>
          <Text style={e.antetitulo}>{antetitulo(noticia)}</Text>
          {noticia.zona ? <DatoEditorial tipo="zona" texto={noticia.zona} /> : null}
          <Text style={e.tituloPrincipal}>{noticia.titulo}</Text>
          <Text style={e.resumen}>{noticia.resumen}</Text>
        </View>
      )}
      {noticia.imagen ? (
        <View style={{ marginBottom: Espacio.l }}>
          <FotoDeNoticia imagen={noticia.imagen} estilo={e.imagenPrincipal} />
        </View>
      ) : null}
      <View style={e.cuerpoPrincipal}>
        <Meta noticia={noticia} e={e} />
        <PorQue razon={razon} />
      </View>
    </EnlaceDeNoticia>
  );
}

function Destacada({ noticia, razon, e, onPress }: PropsDeTarjeta) {
  return (
    <EnlaceDeNoticia onPress={onPress} style={e.destacada}>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Espacio.s }}>
          <Text style={e.antetitulo}>{antetitulo(noticia)}</Text>
          {!noticia.imagen ? <GestoDeSeccion seccion={noticia.seccion} tamano={40} /> : null}
        </View>
        <Text style={e.tituloDestacada}>{noticia.titulo}</Text>
        {!noticia.imagen ? <Text style={e.resumenDestacada} numberOfLines={3}>{noticia.resumen}</Text> : null}
        <Meta noticia={noticia} e={e} compacta />
        <PorQue razon={razon} />
      </View>
      {noticia.imagen ? (
        <FotoDeNoticia imagen={noticia.imagen} estilo={e.imagenDestacada} miniatura />
      ) : null}
    </EnlaceDeNoticia>
  );
}

function Titular({ noticia, razon, e, onPress, primero }: PropsDeTarjeta & { primero: boolean }) {
  return (
    <>
      {primero ? (
        <View style={e.encabezadoTitulares}>
          <Text style={e.encabezadoTitularesTexto}>MÁS TITULARES</Text>
        </View>
      ) : null}
      <EnlaceDeNoticia onPress={onPress} style={e.titular}>
        <Text style={e.antetitulo}>{antetitulo(noticia)}</Text>
        <Text style={e.tituloTitular}>
          {noticia.titulo}
        </Text>
        <Meta noticia={noticia} e={e} compacta />
        <PorQue razon={razon} />
      </EnlaceDeNoticia>
    </>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.papel },
    cabecera: { paddingHorizontal: Espacio.xl, paddingTop: Espacio.l, marginBottom: Espacio.xl },
    filaMarca: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Espacio.m },
    ubicacion: {
      marginLeft: 'auto',
      flexShrink: 1,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      borderRadius: Radio.medio,
      backgroundColor: c.papelHundido,
    },
    ubicacionTexto: { fontFamily: Tipos.textoMedio, fontSize: 13, color: c.tinta, flexShrink: 1 },
    filaFecha: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: Espacio.s,
      marginTop: Espacio.m,
      marginBottom: 6,
    },
    fecha: { fontFamily: Tipos.textoMedio, fontSize: 12, color: c.tintaSuave },
    tituloPortada: { fontFamily: Tipos.lectura, fontSize: 42, lineHeight: 48, letterSpacing: -1, color: c.tinta, marginTop: Espacio.xl },
    rayaFina: { height: 1, backgroundColor: c.bordeFuerte, marginTop: Espacio.l },

    antetitulo: { ...ROTULO, color: c.acento },
    resumen: { fontFamily: Tipos.lectura, fontSize: 18, lineHeight: 26, color: c.tintaSuave },
    meta: { flexDirection: 'row', alignItems: 'center', columnGap: 14, rowGap: 8, flexWrap: 'wrap' },

    principal: {
      marginHorizontal: Espacio.xl,
      marginBottom: Espacio.xl,
      paddingBottom: Espacio.xl,
      borderBottomWidth: 1,
      borderBottomColor: c.borde,
    },
    imagenPrincipal: {
      width: '100%',
      aspectRatio: 16 / 10,
      borderRadius: Radio.chico,
      backgroundColor: c.fotoVacia,
    },
    cuerpoPrincipal: { gap: Espacio.l, marginBottom: Espacio.l },
    tituloPrincipal: { fontFamily: Tipos.titular, fontSize: 32, lineHeight: 36, color: c.tinta },

    destacada: {
      flexDirection: 'row',
      gap: Espacio.m,
      marginHorizontal: Espacio.xl,
      marginBottom: Espacio.xl,
      paddingBottom: Espacio.xl,
      borderBottomWidth: 1,
      borderBottomColor: c.borde,
    },
    tituloDestacada: { fontFamily: Tipos.titular, fontSize: 21, lineHeight: 26, color: c.tinta },
    resumenDestacada: { fontFamily: Tipos.lectura, fontSize: 17, lineHeight: 25, color: c.tintaSuave },
    imagenDestacada: { width: 92, height: 92, borderRadius: Radio.chico, backgroundColor: c.fotoVacia },

    encabezadoTitulares: {
      marginHorizontal: Espacio.xl,
      marginTop: Espacio.s,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: c.tinta,
    },
    encabezadoTitularesTexto: { ...ROTULO, color: c.tinta },
    titular: {
      marginHorizontal: Espacio.xl,
      paddingVertical: Espacio.l,
      borderBottomWidth: 1,
      borderBottomColor: c.borde,
      gap: 6,
    },
    tituloTitular: { fontFamily: Tipos.titular, fontSize: 20, lineHeight: 25, color: c.tinta },

    error: { margin: Espacio.l, fontFamily: Tipos.texto, color: c.peligro },
    vacio: { margin: Espacio.l, fontFamily: Tipos.texto, color: c.tintaSuave, textAlign: 'center' },
  });
}
