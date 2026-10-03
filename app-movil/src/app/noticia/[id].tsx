// ===========================================================================
// La lectura de una noticia
//
// Igual que en la web: el puntaje de veracidad nunca va solo. Abajo del texto
// está el desglose de las cinco señales, en su propio bloque —es información
// SOBRE la noticia, no la noticia—. Y si no hay desglose, se dice que el
// puntaje viene del dato y no de una corrida del canal.
// ===========================================================================

import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Sello } from '@/componentes/sello';
import { Espacio, Tipos, useColores, type Paleta } from '@/constants/tema';
import { leerNoticia, type NoticiaCompleta, type Senal } from '@/lib/noticias';
import { usePreferencias } from '@/lib/preferencias';
import { nombreDeSeccion } from '@/lib/secciones';

const NOMBRES: Readonly<Record<string, string>> = {
  credibilidad_fuente: 'Credibilidad de la fuente',
  url_verificable: 'La URL existe y dice lo que dice',
  corroboracion: 'Corroboración independiente',
  desmentido: 'Desmentidos conocidos',
  coherencia: 'Coherencia interna',
};

export default function Lectura() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColores();
  const e = crearEstilos(c);
  const [noticia, setNoticia] = useState<NoticiaCompleta | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const { registrarLectura } = usePreferencias();

  // Abrir una noticia es la única señal de interés que usa la portada. Sin
  // sesión no se registra nada.
  useEffect(() => {
    registrarLectura(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    leerNoticia(id)
      .then(setNoticia)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [id]);

  if (error) return <Text style={e.error}>{error}</Text>;
  if (noticia === undefined) return <ActivityIndicator style={{ marginTop: 48 }} color={c.acento} />;
  if (noticia === null) return <Text style={e.error}>Esta noticia no existe o no está publicada.</Text>;

  const parrafos = noticia.cuerpo.split(/\n{2,}/).filter((p) => p.trim() !== '');
  const fecha = new Date(noticia.publicadaEn).toLocaleString('es-GT', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <ScrollView style={e.pantalla} contentContainerStyle={e.contenido}>
      <Text style={e.antetitulo}>{nombreDeSeccion(noticia.seccion)}</Text>
      <Text style={e.titulo}>{noticia.titulo}</Text>
      <Text style={e.entradilla}>{noticia.resumen}</Text>

      <View style={e.firma}>
        <Sello puntaje={noticia.puntajeVeracidad} />
        <Text style={e.fuente}>{noticia.fuente ?? 'fuente no registrada'}</Text>
        <Text style={e.fecha}>{fecha}</Text>
      </View>

      {noticia.imagen ? (
        <View style={{ marginBottom: Espacio.xl }}>
          <Image
            source={noticia.imagen.url}
            accessibilityLabel={noticia.imagen.alterno}
            style={e.imagen}
            contentFit="cover"
          />
          <Text style={e.credito}>{noticia.imagen.credito}</Text>
        </View>
      ) : null}

      {parrafos.map((p, i) => (
        <Text key={i} style={e.parrafo}>
          {p}
        </Text>
      ))}

      {noticia.urlOriginal ? (
        <Pressable onPress={() => WebBrowser.openBrowserAsync(noticia.urlOriginal!)} style={e.original}>
          <Text style={e.originalTexto}>Leer el artículo original →</Text>
        </Pressable>
      ) : null}

      <View style={e.ficha}>
        <Text style={e.fichaTitulo}>CÓMO SE VALIDÓ ESTA NOTICIA</Text>
        <Text style={e.fichaIntro}>
          Cinco señales independientes, todas deterministas y sin modelo de lenguaje. El puntaje es
          la suma de lo que aportó cada una.
        </Text>

        {noticia.senales.length === 0 ? (
          <Text style={e.sinDesglose}>
            Esta noticia no tiene desglose guardado, así que el puntaje de arriba viene del dato y no de
            una corrida del canal. Les pasa a las noticias sembradas como demostración.
          </Text>
        ) : (
          noticia.senales.map((s) => <FilaDeSenal key={s.senal} senal={s} e={e} />)
        )}
      </View>
    </ScrollView>
  );
}

function FilaDeSenal({ senal, e }: { senal: Senal; e: ReturnType<typeof crearEstilos> }) {
  const maximo = Number(senal.detalle['maximo'] ?? 0);
  const explicacion = String(senal.detalle['explicacion'] ?? '');

  return (
    <View style={e.senal}>
      <View style={e.senalCabecera}>
        <Text style={e.senalNombre}>{NOMBRES[senal.senal] ?? senal.senal}</Text>
        <Text style={e.senalAporte}>{maximo === 0 ? '—' : `${senal.aporte.toFixed(1)} de ${maximo}`}</Text>
      </View>
      {!senal.disponible ? <Text style={e.senalAviso}>No se pudo comprobar</Text> : null}
      <Text style={e.senalTexto}>{explicacion}</Text>
    </View>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.papel },
    contenido: { padding: Espacio.l, paddingBottom: 64 },
    antetitulo: {
      fontFamily: Tipos.texto,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: c.acento,
      marginBottom: Espacio.s,
    },
    titulo: {
      fontFamily: Tipos.titulares,
      fontSize: 28,
      lineHeight: 33,
      fontWeight: '700',
      color: c.tinta,
      marginBottom: Espacio.m,
    },
    entradilla: {
      fontFamily: Tipos.texto,
      fontSize: 17,
      lineHeight: 25,
      color: c.tintaSuave,
      marginBottom: Espacio.l,
    },
    firma: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      paddingVertical: Espacio.m,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: c.borde,
      marginBottom: Espacio.xl,
    },
    fuente: { fontFamily: Tipos.texto, fontSize: 13, fontWeight: '700', color: c.tinta },
    fecha: { fontFamily: Tipos.texto, fontSize: 12, color: c.tintaTenue },
    imagen: { width: '100%', aspectRatio: 3 / 2, borderRadius: 10, backgroundColor: c.papelHundido },
    credito: {
      fontFamily: Tipos.texto,
      fontSize: 11,
      color: c.tintaTenue,
      marginTop: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    parrafo: {
      fontFamily: Tipos.texto,
      fontSize: 17,
      lineHeight: 28,
      color: c.tinta,
      marginBottom: Espacio.l,
    },
    original: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: c.borde,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginBottom: Espacio.xl,
    },
    originalTexto: { fontFamily: Tipos.texto, fontSize: 14, fontWeight: '600', color: c.acento },

    ficha: { borderTopWidth: 2, borderTopColor: c.tinta, paddingTop: Espacio.m, gap: Espacio.s },
    fichaTitulo: {
      fontFamily: Tipos.texto,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: c.tinta,
    },
    fichaIntro: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 19, color: c.tintaSuave },
    sinDesglose: {
      fontFamily: Tipos.texto,
      fontSize: 13,
      lineHeight: 19,
      color: c.tintaSuave,
      backgroundColor: c.papelHundido,
      padding: Espacio.m,
      borderRadius: 8,
    },
    senal: { borderWidth: 1, borderColor: c.borde, borderRadius: 10, padding: Espacio.m, gap: 4 },
    senalCabecera: { flexDirection: 'row', justifyContent: 'space-between', gap: Espacio.s },
    senalNombre: { fontFamily: Tipos.texto, fontSize: 14, fontWeight: '700', color: c.tinta, flex: 1 },
    senalAporte: { fontFamily: Tipos.texto, fontSize: 13, color: c.tintaSuave },
    senalAviso: { fontFamily: Tipos.texto, fontSize: 12, fontWeight: '700', color: c.alerta },
    senalTexto: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 19, color: c.tintaSuave },

    error: { margin: Espacio.l, fontFamily: Tipos.texto, color: c.peligro },
  });
}
