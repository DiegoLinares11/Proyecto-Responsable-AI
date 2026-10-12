// ===========================================================================
// La lectura de una noticia
//
// Igual que en la web: el puntaje de veracidad nunca va solo. Abajo del texto
// está el desglose de las cinco señales, en su propio bloque —es información
// SOBRE la noticia, no la noticia—. Y si no hay desglose, se dice que el
// puntaje viene del dato y no de una corrida del canal.
//
// Lo que no se pudo comprobar se dice en naranja, con la explicación que dejó
// el canal: una ficha que solo muestra lo que salió bien sería publicidad.
// ===========================================================================

import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Afuera } from '@/componentes/iconos';
import { Sello } from '@/componentes/sello';
import { Espacio, Radio, ROTULO, Tipos, useColores, type Paleta } from '@/constants/tema';
import { leerNoticia, type NoticiaCompleta, type Senal } from '@/lib/noticias';
import { usePreferencias } from '@/lib/preferencias';
import { nombreDeSeccion } from '@/lib/secciones';

const NOMBRES: Readonly<Record<string, string>> = {
  credibilidad_fuente: 'Fuente',
  url_verificable: 'Enlace verificable',
  corroboracion: 'Corroboración',
  coherencia: 'Coherencia',
  desmentido: 'Desmentidos',
};

/** El desmentido va al final: no suma puntos, es un veto. */
const ORDEN = Object.keys(NOMBRES);

const UMBRAL = 75;

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
  const senales = [...noticia.senales].sort((a, b) => ORDEN.indexOf(a.senal) - ORDEN.indexOf(b.senal));
  const seccion = nombreDeSeccion(noticia.seccion);

  return (
    <ScrollView style={e.pantalla} contentContainerStyle={e.contenido}>
      <Text style={e.antetitulo}>{(noticia.zona ? `${seccion} · ${noticia.zona}` : seccion).toUpperCase()}</Text>
      <Text style={e.titulo} accessibilityRole="header">
        {noticia.titulo}
      </Text>

      <View style={e.firma}>
        <Sello puntaje={noticia.puntajeVeracidad} />
        <Text style={e.fuente}>{noticia.fuente ?? 'fuente no registrada'}</Text>
        <Text style={e.fecha}>{fecha}</Text>
      </View>

      {noticia.imagen ? (
        <View style={{ marginBottom: Espacio.l }}>
          <Image
            source={noticia.imagen.url}
            accessibilityLabel={noticia.imagen.alterno}
            style={e.imagen}
            contentFit="cover"
          />
          <Text style={e.credito}>{noticia.imagen.credito}</Text>
        </View>
      ) : null}

      <Text style={e.rotulo}>LO QUE DICE EL MEDIO</Text>
      <Text style={e.entradilla}>{noticia.resumen}</Text>
      {parrafos.map((p, i) => (
        <Text key={i} style={e.parrafo}>
          {p}
        </Text>
      ))}

      {noticia.urlOriginal ? (
        <Pressable
          onPress={() => WebBrowser.openBrowserAsync(noticia.urlOriginal!)}
          style={e.original}
          accessibilityRole="link">
          <Text style={e.originalTexto}>Leer en {noticia.fuente ?? 'el medio original'}</Text>
          <Afuera color={c.tinta} />
        </Pressable>
      ) : null}

      <View style={e.ficha} accessibilityLabel="Ficha de verificación">
        <View style={e.fichaCabecera}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={e.fichaTitulo}>CÓMO LO VERIFICAMOS</Text>
            <Text style={e.fichaIntro}>5 señales, sin IA · se publica desde {UMBRAL}</Text>
          </View>
          {noticia.puntajeVeracidad !== null ? (
            <Text style={e.total}>
              {noticia.puntajeVeracidad}
              <Text style={e.totalDe}> / 100</Text>
            </Text>
          ) : null}
        </View>

        {senales.length === 0 ? (
          <Text style={e.sinDesglose}>
            Esta noticia no tiene desglose guardado, así que el puntaje de arriba viene del dato y no de
            una corrida del canal. Les pasa a las noticias sembradas como demostración.
          </Text>
        ) : (
          senales.map((s) => <FilaDeSenal key={s.senal} senal={s} e={e} />)
        )}
      </View>
    </ScrollView>
  );
}

function numero(x: number): string {
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

type Estado = { texto: string; tono: 'bien' | 'alerta' | 'peligro' } | null;

/** Lo que pasa cuando una señal no dio puntos normales: veto o sin comprobar. */
function estadoDe(senal: Senal): Estado {
  const resultado = String(senal.detalle['resultado'] ?? '');
  if (senal.detalle['veto'] === true) return { texto: 'DESMENTIDA', tono: 'peligro' };
  if (!senal.disponible) return { texto: 'NO SE PUDO COMPROBAR', tono: 'alerta' };
  if (senal.senal === 'desmentido') {
    return resultado.includes('no_configurado')
      ? { texto: 'NO COMPROBADOS', tono: 'alerta' }
      : { texto: 'NINGUNO', tono: 'bien' };
  }
  return null;
}

function FilaDeSenal({ senal, e }: { senal: Senal; e: ReturnType<typeof crearEstilos> }) {
  const maximo = Number(senal.detalle['maximo'] ?? 0);
  // El canal escribe claves como «agencia_internacional»; a la vista, sin guion bajo.
  const explicacion = String(senal.detalle['explicacion'] ?? '').replace(/_/g, ' ');
  const estado = estadoDe(senal);

  const caja = estado?.tono === 'alerta' ? e.senalAlerta : estado?.tono === 'peligro' ? e.senalPeligro : null;
  const colorEstado =
    estado?.tono === 'alerta' ? e.textoAlerta : estado?.tono === 'peligro' ? e.textoPeligro : e.textoBien;

  return (
    <View style={[e.senal, caja]}>
      <View style={e.senalCabecera}>
        <Text style={[e.senalNombre, estado && estado.tono !== 'bien' ? colorEstado : null]}>
          {NOMBRES[senal.senal] ?? senal.senal}
        </Text>
        {estado ? (
          <Text style={[e.senalEstado, colorEstado]}>{estado.texto}</Text>
        ) : (
          <Text style={e.senalAporte}>
            {numero(senal.aporte)} / {maximo}
          </Text>
        )}
      </View>
      {estado === null && maximo > 0 ? (
        <View style={e.barraFondo}>
          <View style={[e.barra, { width: `${Math.min(100, (senal.aporte / maximo) * 100)}%` }]} />
        </View>
      ) : null}
      <Text style={[e.senalTexto, estado?.tono === 'alerta' ? e.textoAlertaSuave : null]}>{explicacion}</Text>
    </View>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.papel },
    contenido: { padding: Espacio.l, paddingBottom: 64 },
    antetitulo: { ...ROTULO, color: c.acento, marginBottom: Espacio.s },
    titulo: { fontFamily: Tipos.titular, fontSize: 27, lineHeight: 32, color: c.tinta, marginBottom: Espacio.m },
    firma: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      paddingVertical: Espacio.m,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: c.borde,
      marginBottom: Espacio.l,
    },
    fuente: { fontFamily: Tipos.textoMedio, fontSize: 13, color: c.tinta },
    fecha: { fontFamily: Tipos.texto, fontSize: 12, color: c.tintaTenue },
    imagen: { width: '100%', aspectRatio: 3 / 2, borderRadius: Radio.chico, backgroundColor: c.fotoVacia },
    credito: { fontFamily: Tipos.texto, fontSize: 11, color: c.tintaTenue, marginTop: 6, letterSpacing: 0.3 },

    rotulo: { ...ROTULO, fontSize: 10, color: c.tintaSuave, marginBottom: Espacio.s },
    entradilla: { fontFamily: Tipos.lectura, fontSize: 19, lineHeight: 27, color: c.tinta, marginBottom: Espacio.l },
    parrafo: { fontFamily: Tipos.lectura, fontSize: 18, lineHeight: 28, color: c.tinta, marginBottom: Espacio.l },
    original: {
      alignSelf: 'flex-start',
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: c.tinta,
      borderRadius: Radio.medio,
      paddingHorizontal: 16,
      marginBottom: Espacio.xl,
    },
    originalTexto: { fontFamily: Tipos.textoMedio, fontSize: 14, color: c.tinta },

    ficha: {
      borderWidth: 1,
      borderColor: c.tinta,
      borderRadius: Radio.medio,
      padding: Espacio.m,
      gap: Espacio.m,
    },
    fichaCabecera: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Espacio.s,
      paddingBottom: Espacio.s,
      borderBottomWidth: 1,
      borderBottomColor: c.bordeFuerte,
      borderStyle: 'dashed',
    },
    fichaTitulo: { ...ROTULO, color: c.tinta },
    fichaIntro: { fontFamily: Tipos.texto, fontSize: 12, color: c.tintaSuave },
    total: { fontFamily: Tipos.numeros, fontSize: 24, color: c.verificado },
    totalDe: { fontFamily: Tipos.numeros, fontSize: 13, color: c.tintaSuave },
    sinDesglose: {
      fontFamily: Tipos.texto,
      fontSize: 13,
      lineHeight: 19,
      color: c.tintaSuave,
      backgroundColor: c.papelHundido,
      padding: Espacio.m,
      borderRadius: Radio.medio,
    },

    senal: { gap: 5 },
    senalAlerta: { backgroundColor: c.alertaFondo, borderRadius: Radio.chico, padding: 10 },
    senalPeligro: { borderWidth: 1, borderColor: c.peligro, borderRadius: Radio.chico, padding: 10 },
    senalCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Espacio.s },
    senalNombre: { fontFamily: Tipos.textoMedio, fontSize: 14, color: c.tinta, flex: 1 },
    senalAporte: { fontFamily: Tipos.numeros, fontSize: 13, color: c.tinta },
    senalEstado: { fontFamily: Tipos.textoFuerte, fontSize: 11, letterSpacing: 0.8 },
    textoBien: { color: c.verificado },
    textoAlerta: { color: c.alerta },
    textoAlertaSuave: { color: c.alertaTexto },
    textoPeligro: { color: c.peligro },
    barraFondo: { height: 5, borderRadius: 3, backgroundColor: c.borde, overflow: 'hidden' },
    barra: { height: 5, borderRadius: 3, backgroundColor: c.verificado },
    senalTexto: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 19, color: c.tintaSuave },

    error: { margin: Espacio.l, fontFamily: Tipos.texto, color: c.peligro },
  });
}
