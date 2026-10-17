import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DatoEditorial } from '@/componentes/dato-editorial';
import { DetalleEditorial } from '@/componentes/detalle-editorial';
import { FichaDeVerificacion } from '@/componentes/ficha-de-verificacion';
import { FotoDeNoticia } from '@/componentes/foto';
import { NotasAlMargen } from '@/componentes/notas-al-margen';
import { PorQueEnTuPortada } from '@/componentes/por-que-aqui';
import { Sello } from '@/componentes/sello';
import { ANCHOS, Espacio, Radio, ROTULO, Tipos, useColores, useDisposicion, type Paleta } from '@/constants/tema';
import { leerNoticia, type NoticiaCompleta } from '@/lib/noticias';
import { usePreferencias } from '@/lib/preferencias';
import { nombreDeSeccion } from '@/lib/secciones';

export default function Lectura() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColores();
  const e = crearEstilos(c);
  const { anchoVentana } = useDisposicion();
  const conMargen = anchoVentana >= 1100;
  const [noticia, setNoticia] = useState<NoticiaCompleta | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [comprobaciones, setComprobaciones] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const posicionFicha = useRef(0);
  const saltoPendiente = useRef(false);
  const { registrarLectura } = usePreferencias();

  useEffect(() => {
    registrarLectura(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let vigente = true;
    leerNoticia(id).then(n => { if (vigente) { setNoticia(n); setComprobaciones(false); setError(null); } })
      .catch(err => { if (vigente) setError(err instanceof Error ? err.message : String(err)); });
    return () => { vigente = false; };
  }, [id]);

  if (error) return <Text style={e.error}>{error}</Text>;
  if (noticia === undefined) return <ActivityIndicator style={{ marginTop: 48 }} color={c.acento} />;
  if (noticia === null) return <Text style={e.error}>Esta noticia no existe o no está publicada.</Text>;

  const parrafos = noticia.cuerpo.split(/\n{2,}/).filter(p => p.trim() !== '' && p.trim() !== noticia.resumen.trim());
  const fecha = new Date(noticia.publicadaEn).toLocaleString('es-GT', { dateStyle: 'long', timeStyle: 'short' });
  const notas = {
    fuente: noticia.fuente ?? 'Fuente no registrada',
    original: noticia.urlOriginal ? () => { void WebBrowser.openBrowserAsync(noticia.urlOriginal!); } : undefined,
    verificar: () => {
      if (comprobaciones) {
        scroll.current?.scrollTo({ y: posicionFicha.current + Espacio.xl, animated: false });
      } else {
        saltoPendiente.current = true;
        setComprobaciones(true);
      }
    },
    consultar: () => router.navigate({ pathname: '/', params: { noticia: noticia.id, titulo: noticia.titulo } }),
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={e.pantalla}>
    <ScrollView ref={scroll} style={e.pantalla} contentContainerStyle={[e.contenido, { maxWidth: conMargen ? 1060 : ANCHOS.lectura }]}
      onContentSizeChange={() => {
        if (saltoPendiente.current) {
          saltoPendiente.current = false;
          scroll.current?.scrollTo({ y: posicionFicha.current + Espacio.xl, animated: false });
        }
      }}>
      <View style={e.disposicion}>
        <View style={e.articulo}>
          <View style={e.contexto}>
            <Text style={e.antetitulo}>{nombreDeSeccion(noticia.seccion).toUpperCase()}</Text>
            {noticia.zona ? <DatoEditorial tipo="zona" texto={noticia.zona} /> : null}
          </View>
          <Text style={[e.titulo, conMargen && { fontSize: 44, lineHeight: 49 }]} accessibilityRole="header">{noticia.titulo}</Text>
          <View style={e.firma}>
            <Sello puntaje={noticia.puntajeVeracidad} enDesarrollo={noticia.enDesarrollo} />
            <DatoEditorial tipo="fuente" texto={notas.fuente} />
            <DatoEditorial tipo="fecha" texto={fecha} />
          </View>
          {/* R-13: lo no confirmado se dice con palabras, no con un puntaje. */}
          {noticia.enDesarrollo ? (
            <View style={[e.enDesarrollo, { backgroundColor: c.alertaFondo, borderLeftColor: c.alerta }]} accessibilityRole="alert">
              <Text style={[e.enDesarrolloTexto, { color: c.alertaTexto }]}>
                En desarrollo: lo que dice esta nota todavía no está confirmado. Una persona la publicó así porque el hecho sigue en curso, y puede cambiar.
              </Text>
            </View>
          ) : null}
          {noticia.imagen ? <View style={{ marginBottom: Espacio.xl }}><FotoDeNoticia imagen={noticia.imagen} estilo={e.imagen} /></View> : null}
          <Text style={e.rotulo}>LO QUE DICE EL MEDIO</Text>
          <Text style={e.entradilla}>{noticia.resumen}</Text>
          {!conMargen ? <NotasAlMargen {...notas} compacta /> : null}
          {parrafos.map((p, i) => <Text key={i} style={e.parrafo}>{p}</Text>)}
          <View onLayout={evento => { posicionFicha.current = evento.nativeEvent.layout.y; }} style={{ marginTop: Espacio.xl }}>
            <FichaDeVerificacion noticia={noticia} abierto={comprobaciones} alCambiar={setComprobaciones} />
          </View>
          <View style={{ marginTop: Espacio.xxl }}>
            <DatoEditorial tipo="contexto" texto="Tu ubicación y tus lecturas ayudan a ordenar la portada." />
            <DetalleEditorial titulo="¿Por qué aparece en tu portada?"><PorQueEnTuPortada noticia={noticia} /></DetalleEditorial>
          </View>
        </View>
        {conMargen ? <View style={e.margen}><NotasAlMargen {...notas} /></View> : null}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.papel },
    contenido: { padding: Espacio.xl, paddingBottom: 64, width: '100%', alignSelf: 'center' },
    disposicion: { flexDirection: 'row', gap: 48, alignItems: 'flex-start' },
    articulo: { flex: 1, minWidth: 0, maxWidth: ANCHOS.lectura },
    margen: { width: 208, paddingTop: Espacio.s },
    contexto: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Espacio.m, marginBottom: Espacio.l },
    antetitulo: { ...ROTULO, color: c.acento },
    titulo: { fontFamily: Tipos.titular, fontSize: 34, lineHeight: 39, color: c.tinta, marginBottom: Espacio.xl },
    firma: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Espacio.m, paddingVertical: Espacio.l, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.borde, marginBottom: Espacio.xl },
    imagen: { width: '100%', aspectRatio: 3 / 2, borderRadius: Radio.chico, backgroundColor: c.fotoVacia },
    rotulo: { ...ROTULO, fontSize: 10, color: c.tintaSuave, marginBottom: Espacio.s },
    enDesarrollo: { borderLeftWidth: 3, padding: Espacio.m, marginBottom: Espacio.xl, borderRadius: Radio.chico },
    enDesarrolloTexto: { fontFamily: Tipos.textoMedio, fontSize: 14, lineHeight: 21 },
    entradilla: { fontFamily: Tipos.lectura, fontSize: 22, lineHeight: 31, color: c.tinta, marginBottom: Espacio.xl },
    parrafo: { fontFamily: Tipos.lectura, fontSize: 19, lineHeight: 30, color: c.tinta, marginBottom: Espacio.xl },
    error: { margin: Espacio.l, fontFamily: Tipos.texto, color: c.peligro },
  });
}
