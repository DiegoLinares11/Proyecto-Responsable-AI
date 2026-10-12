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
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FotoDeNoticia } from '@/componentes/foto';
import { Abajo, Pin } from '@/componentes/iconos';
import { IlustracionTipografica } from '@/componentes/ilustracion';
import { Logotipo } from '@/componentes/marca';
import { PortadaAncha } from '@/componentes/portada-ancha';
import { Sello } from '@/componentes/sello';
import { SelectorDeUbicacion } from '@/componentes/selector-de-ubicacion';
import { Espacio, Radio, ROTULO, Tipos, useColores, useDisposicion, type Paleta } from '@/constants/tema';
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
  const { ubicacion, lecturas } = usePreferencias();
  const { ancha, anchoVentana } = useDisposicion();

  // Se recalcula en el teléfono cada vez que cambia la ubicación o una lectura:
  // es aritmética sobre unas decenas de noticias, no una llamada.
  const lista = useMemo(
    () => (noticias === null ? null : personalizar(noticias, ubicacion, lecturas)),
    [noticias, ubicacion, lecturas],
  );

  const cargar = useCallback(async () => {
    try {
      const leidas = await leerFeed();
      setNoticias(leidas);
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
        if (vigente) setNoticias(leidas);
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
  const fecha = new Date().toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' });
  const hoy = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  const orden = lecturas.length > 0 ? 'Para tu zona y lo que leés' : 'Ordenada para tu zona';

  // En una pantalla ancha, la disposición de un diario en línea; el orden y las
  // razones son los mismos (src/componentes/portada-ancha.tsx).
  if (ancha) {
    return (
      <SafeAreaView style={e.pantalla} edges={['top']}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.acento} />}>
          {error ? (
            <Text style={e.error}>{error}</Text>
          ) : lista === null ? (
            <ActivityIndicator style={{ marginTop: 48 }} color={c.acento} />
          ) : lista.length === 0 ? (
            <Text style={e.vacio}>Todavía no hay noticias verificadas.</Text>
          ) : (
            <PortadaAncha
              lista={lista}
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={e.pantalla} edges={['top']}>
      <FlatList
        data={lista ?? []}
        keyExtractor={(n) => n.noticia.id}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.acento} />}
        ListHeaderComponent={
          <View style={e.cabecera}>
            <View style={e.filaMarca}>
              <Logotipo />
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
              <Text style={e.fecha}>{hoy}</Text>
              <Text style={e.fecha}>{orden}</Text>
            </View>
            {/* La doble raya de la cabecera de un diario. */}
            <View style={e.rayaGruesa} />
            <View style={e.rayaFina} />
            <SelectorDeUbicacion visible={eligiendo} cerrar={() => setEligiendo(false)} />
          </View>
        }
        ListEmptyComponent={
          error ? (
            <Text style={e.error}>{error}</Text>
          ) : lista === null ? (
            <ActivityIndicator style={{ marginTop: 48 }} color={c.acento} />
          ) : (
            <Text style={e.vacio}>Todavía no hay noticias verificadas.</Text>
          )
        }
        ListFooterComponent={
          lista && lista.length > 0 ? (
            <Text style={e.pie}>
              Sin esconder lo local, lo nacional ni lo internacional. Cada noticia dice por qué está donde
              está.
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => {
          const props = { noticia: item.noticia, razon: porQue(item), e, onPress: () => abrir(item.noticia.id) };
          return index === 0 ? (
            <Principal {...props} />
          ) : index <= DESTACADAS ? (
            <Destacada {...props} />
          ) : (
            <Titular {...props} primero={index === DESTACADAS + 1} />
          );
        }}
      />
    </SafeAreaView>
  );
}

type PropsDeTarjeta = {
  noticia: NoticiaDelFeed;
  razon: Razon;
  e: ReturnType<typeof crearEstilos>;
  onPress: () => void;
};

/** «SALUD · QUETZALTENANGO»: la sección y, si es local, la zona. */
function antetitulo(noticia: NoticiaDelFeed): string {
  const seccion = nombreDeSeccion(noticia.seccion);
  return (noticia.zona ? `${seccion} · ${noticia.zona}` : seccion).toUpperCase();
}

/** La línea de «por qué está aquí». */
function PorQue({ razon, e }: { razon: Razon; e: ReturnType<typeof crearEstilos> }) {
  return (
    <Text
      style={[e.razon, razon.tono === 'zona' ? e.razonZona : razon.tono === 'cobertura' ? e.razonCobertura : null]}>
      {razon.texto}
    </Text>
  );
}

function Meta({ noticia, e, compacta = false }: Pick<PropsDeTarjeta, 'noticia' | 'e'> & { compacta?: boolean }) {
  return (
    <View style={e.meta}>
      <Sello puntaje={noticia.puntajeVeracidad} compacto={compacta} />
      <Text style={e.metaFuente} numberOfLines={1}>
        {noticia.fuente ?? 'fuente no registrada'}
      </Text>
      <Text style={e.metaTexto}>{haceCuanto(noticia.publicadaEn)}</Text>
    </View>
  );
}

function Principal({ noticia, razon, e, onPress }: PropsDeTarjeta) {
  return (
    <Pressable onPress={onPress} style={e.principal} accessibilityRole="link">
      <View style={{ marginBottom: Espacio.m }}>
        {noticia.imagen ? (
          <FotoDeNoticia imagen={noticia.imagen} estilo={e.imagenPrincipal} />
        ) : (
          <IlustracionTipografica seccion={nombreDeSeccion(noticia.seccion)} titulo={noticia.titulo} />
        )}
      </View>
      <View style={e.cuerpoPrincipal}>
        <Text style={e.antetitulo}>{antetitulo(noticia)}</Text>
        <Text style={e.tituloPrincipal}>{noticia.titulo}</Text>
        <Text style={e.resumen} numberOfLines={3}>
          {noticia.resumen}
        </Text>
        <Meta noticia={noticia} e={e} />
        <PorQue razon={razon} e={e} />
      </View>
    </Pressable>
  );
}

function Destacada({ noticia, razon, e, onPress }: PropsDeTarjeta) {
  return (
    <Pressable onPress={onPress} style={e.destacada} accessibilityRole="link">
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={e.antetitulo}>{antetitulo(noticia)}</Text>
        <Text style={e.tituloDestacada} numberOfLines={4}>
          {noticia.titulo}
        </Text>
        <Meta noticia={noticia} e={e} compacta />
        <PorQue razon={razon} e={e} />
      </View>
      {noticia.imagen ? (
        <FotoDeNoticia imagen={noticia.imagen} estilo={e.imagenDestacada} miniatura />
      ) : (
        <IlustracionTipografica seccion={nombreDeSeccion(noticia.seccion)} titulo={noticia.titulo} chica />
      )}
    </Pressable>
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
      <Pressable onPress={onPress} style={e.titular} accessibilityRole="link">
        <Text style={e.tituloTitular} numberOfLines={3}>
          {noticia.titulo}
        </Text>
        <View style={e.meta}>
          <Sello puntaje={noticia.puntajeVeracidad} compacto />
          <Text style={e.metaTexto}>
            {nombreDeSeccion(noticia.seccion)} · {noticia.fuente ?? 'sin registrar'} ·{' '}
            {haceCuanto(noticia.publicadaEn)}
          </Text>
        </View>
        <PorQue razon={razon} e={e} />
      </Pressable>
    </>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.papel },
    cabecera: { paddingHorizontal: Espacio.l, paddingTop: Espacio.s, marginBottom: Espacio.l },
    filaMarca: { flexDirection: 'row', alignItems: 'center', gap: Espacio.m },
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
      justifyContent: 'space-between',
      gap: Espacio.s,
      marginTop: Espacio.m,
      marginBottom: 6,
    },
    fecha: { fontFamily: Tipos.textoMedio, fontSize: 12, color: c.tintaSuave },
    rayaGruesa: { height: 3, backgroundColor: c.tinta },
    rayaFina: { height: 1, backgroundColor: c.tinta, marginTop: 2 },

    razon: { fontFamily: Tipos.texto, fontSize: 12, color: c.tintaTenue },
    razonZona: { fontFamily: Tipos.textoMedio, color: c.acento },
    razonCobertura: { fontFamily: Tipos.textoMedio, color: c.tintaSuave },

    antetitulo: { ...ROTULO, color: c.acento },
    resumen: { fontFamily: Tipos.lectura, fontSize: 16, lineHeight: 23, color: c.tintaSuave },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    metaFuente: { fontFamily: Tipos.textoMedio, fontSize: 12, color: c.tinta, flexShrink: 1 },
    metaTexto: { fontFamily: Tipos.texto, fontSize: 12, color: c.tintaTenue },

    principal: {
      marginHorizontal: Espacio.l,
      marginBottom: Espacio.l,
      paddingBottom: Espacio.l,
      borderBottomWidth: 1,
      borderBottomColor: c.borde,
    },
    imagenPrincipal: {
      width: '100%',
      aspectRatio: 16 / 10,
      borderRadius: Radio.chico,
      backgroundColor: c.fotoVacia,
    },
    cuerpoPrincipal: { gap: Espacio.s },
    tituloPrincipal: { fontFamily: Tipos.titular, fontSize: 26, lineHeight: 30, color: c.tinta },

    destacada: {
      flexDirection: 'row',
      gap: Espacio.m,
      marginHorizontal: Espacio.l,
      marginBottom: Espacio.l,
      paddingBottom: Espacio.l,
      borderBottomWidth: 1,
      borderBottomColor: c.borde,
    },
    tituloDestacada: { fontFamily: Tipos.titular, fontSize: 18, lineHeight: 22, color: c.tinta },
    imagenDestacada: { width: 92, height: 92, borderRadius: Radio.chico, backgroundColor: c.fotoVacia },

    encabezadoTitulares: {
      marginHorizontal: Espacio.l,
      marginTop: Espacio.s,
      paddingBottom: 6,
      borderBottomWidth: 3,
      borderBottomColor: c.tinta,
    },
    encabezadoTitularesTexto: { ...ROTULO, color: c.tinta },
    titular: {
      marginHorizontal: Espacio.l,
      paddingVertical: Espacio.m,
      borderBottomWidth: 1,
      borderBottomColor: c.borde,
      gap: 6,
    },
    tituloTitular: { fontFamily: Tipos.titular, fontSize: 16, lineHeight: 21, color: c.tinta },

    pie: {
      fontFamily: Tipos.texto,
      fontSize: 12,
      lineHeight: 17,
      color: c.tintaTenue,
      textAlign: 'center',
      paddingHorizontal: Espacio.xl,
      paddingVertical: Espacio.xl,
    },
    error: { margin: Espacio.l, fontFamily: Tipos.texto, color: c.peligro },
    vacio: { margin: Espacio.l, fontFamily: Tipos.texto, color: c.tintaSuave, textAlign: 'center' },
  });
}
