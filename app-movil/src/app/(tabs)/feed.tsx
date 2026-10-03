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

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Sello } from '@/componentes/sello';
import { SelectorDeUbicacion } from '@/componentes/selector-de-ubicacion';
import { Espacio, Tipos, useColores, type Paleta } from '@/constants/tema';
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

  return (
    <SafeAreaView style={e.pantalla} edges={['top']}>
      <FlatList
        data={lista ?? []}
        keyExtractor={(n) => n.noticia.id}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.acento} />}
        ListHeaderComponent={
          <View style={e.cabecera}>
            <Text style={e.fecha}>{hoy}</Text>
            <Text style={e.marca}>Portada</Text>
            <Pressable
              onPress={() => setEligiendo(true)}
              style={e.ubicacion}
              accessibilityRole="button"
              accessibilityLabel={`Ubicación simulada: ${ubicacion.nombre}. Tocá para cambiarla.`}>
              <Text style={e.ubicacionTexto}>📍 {ubicacion.nombre}</Text>
              <Text style={e.ubicacionCambiar}>cambiar</Text>
            </Pressable>
            <Text style={e.subtitulo}>
              Ordenada para {ubicacion.nombre}
              {lecturas.length > 0 ? ' y lo que leés' : ''}, sin esconder lo local, lo nacional ni lo
              internacional. Cada noticia dice por qué está donde está.
            </Text>
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

/** La línea de «por qué está aquí». */
function PorQue({ razon, e }: { razon: Razon; e: ReturnType<typeof crearEstilos> }) {
  return (
    <Text
      style={[e.razon, razon.tono === 'zona' ? e.razonZona : razon.tono === 'cobertura' ? e.razonCobertura : null]}>
      {razon.texto}
    </Text>
  );
}

function Meta({ noticia, e }: Pick<PropsDeTarjeta, 'noticia' | 'e'>) {
  return (
    <View style={e.meta}>
      <Sello puntaje={noticia.puntajeVeracidad} />
      <Text style={e.metaFuente} numberOfLines={1}>
        {noticia.fuente ?? 'fuente no registrada'}
      </Text>
      <Text style={e.metaTexto}>{haceCuanto(noticia.publicadaEn)}</Text>
    </View>
  );
}

function Principal({ noticia, razon, e, onPress }: PropsDeTarjeta) {
  return (
    <Pressable onPress={onPress} style={e.principal}>
      {noticia.imagen ? (
        <Image
          source={noticia.imagen.url}
          accessibilityLabel={noticia.imagen.alterno}
          style={e.imagenPrincipal}
          contentFit="cover"
          transition={200}
        />
      ) : null}
      <View style={e.cuerpoPrincipal}>
        <Text style={e.antetitulo}>{nombreDeSeccion(noticia.seccion)}</Text>
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
    <Pressable onPress={onPress} style={e.destacada}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={e.antetitulo}>{nombreDeSeccion(noticia.seccion)}</Text>
        <Text style={e.tituloDestacada} numberOfLines={4}>
          {noticia.titulo}
        </Text>
        <Meta noticia={noticia} e={e} />
        <PorQue razon={razon} e={e} />
      </View>
      {noticia.imagen ? (
        <Image
          source={noticia.imagen.url}
          accessibilityLabel={noticia.imagen.alterno}
          style={e.imagenDestacada}
          contentFit="cover"
        />
      ) : null}
    </Pressable>
  );
}

function Titular({ noticia, razon, e, onPress, primero }: PropsDeTarjeta & { primero: boolean }) {
  return (
    <>
      {primero ? <Text style={e.encabezadoTitulares}>MÁS TITULARES</Text> : null}
      <Pressable onPress={onPress} style={e.titular}>
        <Text style={e.tituloTitular} numberOfLines={3}>
          {noticia.titulo}
        </Text>
        <Text style={e.metaTexto}>
          {nombreDeSeccion(noticia.seccion)} · {noticia.fuente ?? 'sin registrar'} ·{' '}
          {haceCuanto(noticia.publicadaEn)}
        </Text>
        <PorQue razon={razon} e={e} />
      </Pressable>
    </>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.papel },
    cabecera: {
      paddingHorizontal: Espacio.l,
      paddingTop: Espacio.s,
      paddingBottom: Espacio.m,
      borderBottomWidth: 2,
      borderBottomColor: c.tinta,
      marginBottom: Espacio.l,
    },
    fecha: {
      fontFamily: Tipos.texto,
      fontSize: 12,
      color: c.tintaSuave,
    },
    marca: { fontFamily: Tipos.titulares, fontSize: 34, fontWeight: '700', color: c.tinta },
    subtitulo: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 18, color: c.tintaSuave, marginTop: 4 },
    ubicacion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      marginTop: Espacio.s,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: c.papelHundido,
      borderWidth: 1,
      borderColor: c.borde,
    },
    ubicacionTexto: { fontFamily: Tipos.texto, fontSize: 14, fontWeight: '700', color: c.tinta },
    ubicacionCambiar: { fontFamily: Tipos.texto, fontSize: 13, color: c.acento },
    razon: { fontFamily: Tipos.texto, fontSize: 12, color: c.tintaTenue, marginTop: 2 },
    razonZona: { color: c.verificado, fontWeight: '700' },
    razonCobertura: { color: c.acento, fontWeight: '600' },

    antetitulo: {
      fontFamily: Tipos.texto,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: c.acento,
    },
    resumen: { fontFamily: Tipos.texto, fontSize: 15, lineHeight: 21, color: c.tintaSuave },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    metaFuente: { fontFamily: Tipos.texto, fontSize: 12, fontWeight: '700', color: c.tinta, flexShrink: 1 },
    metaTexto: { fontFamily: Tipos.texto, fontSize: 12, color: c.tintaTenue },

    principal: {
      marginHorizontal: Espacio.l,
      marginBottom: Espacio.xl,
      paddingBottom: Espacio.xl,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borde,
    },
    imagenPrincipal: {
      width: '100%',
      aspectRatio: 16 / 10,
      borderRadius: 10,
      backgroundColor: c.papelHundido,
      marginBottom: Espacio.m,
    },
    cuerpoPrincipal: { gap: Espacio.s },
    tituloPrincipal: {
      fontFamily: Tipos.titulares,
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '700',
      color: c.tinta,
    },

    destacada: {
      flexDirection: 'row',
      gap: Espacio.m,
      marginHorizontal: Espacio.l,
      marginBottom: Espacio.l,
      paddingBottom: Espacio.l,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borde,
    },
    tituloDestacada: {
      fontFamily: Tipos.titulares,
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '700',
      color: c.tinta,
    },
    imagenDestacada: {
      width: 104,
      height: 104,
      borderRadius: 8,
      backgroundColor: c.papelHundido,
    },

    encabezadoTitulares: {
      fontFamily: Tipos.texto,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: c.tinta,
      marginHorizontal: Espacio.l,
      marginTop: Espacio.s,
      paddingBottom: Espacio.s,
      borderBottomWidth: 2,
      borderBottomColor: c.tinta,
    },
    titular: {
      marginHorizontal: Espacio.l,
      paddingVertical: Espacio.m,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borde,
      gap: 4,
    },
    tituloTitular: {
      fontFamily: Tipos.titulares,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '600',
      color: c.tinta,
    },

    error: { margin: Espacio.l, fontFamily: Tipos.texto, color: c.peligro },
    vacio: { margin: Espacio.l, fontFamily: Tipos.texto, color: c.tintaSuave, textAlign: 'center' },
  });
}
