// El texto de la conversación vive solo en esta pantalla. Las garantías de
// retención del servidor son independientes de esta presentación.
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AreaDePestana } from '@/componentes/area-de-pestana';

import { BotonGoogle } from '@/componentes/boton-google';
import { SelloMarca } from '@/componentes/marca';
import { ACCESO_DE_ENLACE } from '@/componentes/acceso-de-enlace';
import { Asistente, Derecha, Enviar, Pin } from '@/componentes/iconos';
import { SelectorDeUbicacion } from '@/componentes/selector-de-ubicacion';
import { ANCHOS, Espacio, ROTULO, Tipos, useColores, useDisposicion, type Paleta } from '@/constants/tema';
import { preguntar } from '@/lib/chat';
import { titulosDe } from '@/lib/noticias';
import { usePreferencias } from '@/lib/preferencias';
import { useSesion } from '@/lib/sesion';

type Turno =
  | { id: string; rol: 'usuario'; texto: string }
  | { id: string; rol: 'asistente'; texto: string; bloqueado: boolean; confianza: 'alta' | 'media' | 'baja' | null; citadas: { id: string; titulo: string }[] }
  | { id: string; rol: 'error'; texto: string; pregunta: string };

function sugerencias(zona: string) {
  return ['Resumime lo más reciente', `¿Qué está pasando en ${zona}?`, 'Explicame lo más importante del mundo hoy', '¿Qué se sabe de la tasa de interés?'];
}
const CONFIANZA = { alta: 'Confianza alta', media: 'Confianza media', baja: 'Confianza baja' };

export default function Chat() {
  const { sesion } = useSesion();
  // Cambiar de cuenta o cerrar sesión abre un cuaderno vacío.
  return <Cuaderno key={sesion?.user.id ?? 'visitante'} />;
}

function Cuaderno() {
  const c = useColores();
  const e = crearEstilos(c);
  const { anchoVentana } = useDisposicion();
  const { sesion, cargando } = useSesion();
  const { ubicacion } = usePreferencias();
  const params = useLocalSearchParams<{ noticia?: string; titulo?: string }>();
  const contexto = typeof params.noticia === 'string' && typeof params.titulo === 'string' ? params.noticia : null;
  const preguntaContextual = contexto ? `Explicame el contexto de esta noticia: «${params.titulo!.slice(0, 300)}».` : '';
  const [contextoUsado, setContextoUsado] = useState<string | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [borrador, setBorrador] = useState('');
  const [pensando, setPensando] = useState(false);
  const [eligiendo, setEligiendo] = useState(false);
  const lista = useRef<FlatList<Turno>>(null);
  const insets = useSafeAreaInsets();
  const entrada = contexto && contexto !== contextoUsado ? preguntaContextual : borrador;
  const secuencia = useRef(0);
  const nuevoId = () => String(++secuencia.current);

  async function enviar(texto: string) {
    const mensaje = texto.trim();
    if (!mensaje || pensando) return;
    setContextoUsado(contexto);
    setBorrador('');
    const idUsuario = nuevoId();
    setTurnos(t => [...t, { id: idUsuario, rol: 'usuario', texto: mensaje }]);
    setPensando(true);
    try {
      const r = await preguntar(mensaje, ubicacion.id);
      const titulos = await titulosDe(r.noticiasCitadas ?? []);
      const idRespuesta = nuevoId();
      setTurnos(t => [...t, {
        id: idRespuesta, rol: 'asistente', texto: r.respuesta, bloqueado: r.bloqueado, confianza: r.confianza,
        citadas: (r.noticiasCitadas ?? []).filter(id => titulos.has(id)).map(id => ({ id, titulo: titulos.get(id)! })),
      }]);
    } catch (error) {
      const idError = nuevoId();
      setTurnos(t => [...t, { id: idError, rol: 'error', texto: error instanceof Error ? error.message : String(error), pregunta: mensaje }]);
    } finally {
      setPensando(false);
    }
  }

  if (cargando) return <AreaDePestana style={[e.pantalla, e.centro]} compositor><ActivityIndicator color={c.asistente} /></AreaDePestana>;

  return (
    <AreaDePestana style={e.pantalla} compositor>
      <View style={e.columna}>
        <View style={e.cabecera}>
          <View style={e.filaTitulo}>
            <View style={e.simbolo}><SelloMarca tamano={26} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={e.titulo} accessibilityRole="header" accessibilityLabel="Cuaderno de contexto">{anchoVentana < 420 ? 'Cuaderno' : 'Cuaderno de contexto'}</Text>
              <Text style={e.lema}>Asistente de noticias</Text>
            </View>
          </View>
          <Pressable onPress={() => setEligiendo(true)} style={({ pressed }) => [e.zona, pressed && { opacity: 0.65 }]} accessibilityRole="button" accessibilityLabel={`Cambiar ubicación del asistente: ${ubicacion.nombre}`}>
            <Pin color={c.acento} />
            <Text style={e.zonaTexto} numberOfLines={1}>{ubicacion.nombre}</Text>
          </Pressable>
        </View>
        {sesion === null ? (
          <ScrollView contentContainerStyle={e.bienvenida}>
            <Text style={e.rotulo}>UN ESPACIO PARA PREGUNTAR</Text>
            <Text style={e.tituloBienvenida}>Conecta con lo que pasa.</Text>
            <Text style={e.textoBienvenida}>Consultá las noticias de la plataforma, explorá su contexto y encontrá las fuentes de cada respuesta.</Text>
            {contexto ? <View style={e.consultaPreparada}><Text style={e.rotulo}>CONSULTA PREPARADA</Text><Text style={e.textoBienvenida}>{preguntaContextual}</Text></View> : <IndiceDeConsultas preguntas={sugerencias(ubicacion.nombre)} />}
            <View style={e.acceso}>
              <Text style={e.textoBienvenida}>Entrá con tu cuenta para empezar una consulta.</Text>
              <BotonGoogle />
              <Pressable {...ACCESO_DE_ENLACE} onPress={() => router.navigate('/feed')} style={e.enlaceToque} accessibilityRole="link">
                <Text style={e.enlace}>Leer la portada sin cuenta</Text><Derecha color={c.acento} />
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined} keyboardVerticalOffset={Platform.OS === 'web' ? 0 : insets.top}>
            <FlatList
              ref={lista} data={turnos} keyExtractor={t => t.id}
              contentContainerStyle={e.conversacion}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => { if (turnos.length > 0) lista.current?.scrollToEnd({ animated: false }); }}
              ListEmptyComponent={<View style={e.vacio}>
                <Text style={e.rotulo}>ABRÍ UNA CONSULTA</Text>
                <Text style={e.vacioTitulo}>{contexto ? 'Sigamos el hilo de esta noticia.' : 'Una consulta, varias perspectivas.'}</Text>
                <Text style={e.textoBienvenida}>{contexto ? 'Dejamos una pregunta preparada. Podés editarla antes de enviarla.' : 'Elegí por dónde empezar o escribí tu propia pregunta.'}</Text>
                <IndiceDeConsultas preguntas={sugerencias(ubicacion.nombre)} alElegir={enviar} />
              </View>}
              ListFooterComponent={pensando ? <View style={e.pensando} accessibilityLiveRegion="polite"><ActivityIndicator size="small" color={c.asistente} /><Text style={e.pie}>Consultando las noticias publicadas…</Text></View> : null}
              renderItem={({ item }) => <Mensaje turno={item} e={e} reintentar={enviar} pensando={pensando} />}
            />
            <View style={e.barraDeEntrada}>
              <TextInput value={entrada} onChangeText={texto => { setContextoUsado(contexto); setBorrador(texto); }}
                placeholder="Escribí tu pregunta…" placeholderTextColor={c.tintaTenue} accessibilityLabel="Tu pregunta"
                style={e.entrada} multiline maxLength={2000} onSubmitEditing={() => enviar(entrada)} />
              <Pressable onPress={() => enviar(entrada)} disabled={pensando || entrada.trim() === ''} accessibilityRole="button" accessibilityLabel="Enviar pregunta"
                style={({ pressed }) => [e.enviar, { opacity: pensando || entrada.trim() === '' ? 0.35 : pressed ? 0.65 : 1 }]}>
                <Enviar color={c.sobrePrimario} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
      <SelectorDeUbicacion visible={eligiendo} cerrar={() => setEligiendo(false)} />
    </AreaDePestana>
  );
}

function IndiceDeConsultas({ preguntas, alElegir }: { preguntas: string[]; alElegir?: (texto: string) => void }) {
  const c = useColores();
  const e = crearEstilos(c);
  return <View style={e.indice}>{preguntas.map((pregunta, i) => {
    const contenido = <><Text style={e.numeroConsulta} aria-hidden>{String(i + 1).padStart(2, '0')}</Text><Text style={e.consultaTexto}>{pregunta}</Text>{alElegir ? <Derecha color={c.asistente} tamano={17} /> : null}</>;
    return alElegir ? <Pressable key={pregunta} onPress={() => alElegir(pregunta)} accessibilityRole="button" style={({ pressed }) => [e.consulta, pressed && { opacity: 0.65 }]}>{contenido}</Pressable> : <View key={pregunta} style={e.consulta}>{contenido}</View>;
  })}</View>;
}

function Mensaje({ turno, e, reintentar, pensando }: { turno: Turno; e: ReturnType<typeof crearEstilos>; reintentar: (texto: string) => void; pensando: boolean }) {
  const c = useColores();
  if (turno.rol === 'usuario') return <View style={e.pregunta}><Text style={e.rotulo}>TU CONSULTA</Text><Text selectable style={e.textoUsuario}>{turno.texto}</Text></View>;
  if (turno.rol === 'error') return <View style={e.error} accessibilityLiveRegion="polite"><Text style={e.textoError}>{turno.texto}</Text><Pressable onPress={() => reintentar(turno.pregunta)} disabled={pensando} style={e.enlaceToque} accessibilityRole="button"><Text style={e.enlace}>Reintentar consulta</Text></Pressable></View>;
  return (
    <View style={e.respuesta}>
      <View style={e.etiquetaIA}><Asistente color={c.asistente} /><Text style={e.identidadIA}>Generado por IA</Text></View>
      {turno.bloqueado ? <Text style={e.pie}>Respuesta limitada por las defensas</Text> : null}
      {turno.texto.split(/\n\s*\n/).filter(Boolean).map((p, i) => <Text key={i} selectable style={e.textoAsistente}>{p}</Text>)}
      {turno.citadas.length > 0 ? <View style={e.referencias}>
        <Text style={e.rotulo}>FUENTES DE ESTA RESPUESTA</Text>
        {turno.citadas.map((n, i) => <Pressable {...ACCESO_DE_ENLACE} key={n.id} onPress={() => router.push({ pathname: '/noticia/[id]', params: { id: n.id } })} style={({ pressed }) => [e.fuente, pressed && { opacity: 0.65 }]} accessibilityRole="link">
          <Text style={e.numeroConsulta} aria-hidden>{String(i + 1).padStart(2, '0')}</Text><Text style={e.fuenteTitulo}>{n.titulo}</Text><Derecha color={c.asistente} tamano={16} />
        </Pressable>)}
      </View> : null}
      <Text style={e.pie}>{turno.confianza ? `${CONFIANZA[turno.confianza]}. ` : ''}Puede equivocarse: una respuesta suya no prueba que algo sea cierto.</Text>
    </View>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.papel },
    columna: { flex: 1, width: '100%', maxWidth: ANCHOS.conversacion, alignSelf: 'center' },
    centro: { alignItems: 'center', justifyContent: 'center' },
    cabecera: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Espacio.m, padding: Espacio.l, borderBottomWidth: 1, borderBottomColor: c.borde },
    filaTitulo: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: Espacio.m },
    simbolo: { backgroundColor: c.papel },
    titulo: { fontFamily: Tipos.titular, fontSize: 26, lineHeight: 32, color: c.tinta },
    lema: { fontFamily: Tipos.texto, fontSize: 12, lineHeight: 19, color: c.tintaSuave },
    zona: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, maxWidth: '100%', marginLeft: 'auto', paddingHorizontal: Espacio.m, borderRadius: 8, borderWidth: 1, borderColor: c.borde, backgroundColor: c.papelHundido },
    zonaTexto: { fontFamily: Tipos.textoMedio, fontSize: 12, lineHeight: 19, color: c.tinta, flexShrink: 1 },
    bienvenida: { padding: Espacio.pagina, paddingTop: 40, gap: Espacio.xl, paddingBottom: 48 },
    rotulo: { ...ROTULO, color: c.acento, fontSize: 10 },
    tituloBienvenida: { fontFamily: Tipos.titular, fontSize: 36, lineHeight: 44, letterSpacing: -0.8, color: c.tinta },
    textoBienvenida: { fontFamily: Tipos.texto, fontSize: 15, lineHeight: 25, color: c.tintaSuave },
    acceso: { gap: Espacio.l, borderTopWidth: 1, borderTopColor: c.borde, paddingTop: Espacio.xl },
    enlaceToque: { minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Espacio.m },
    enlace: { fontFamily: Tipos.textoMedio, fontSize: 14, lineHeight: 22, color: c.acento },
    conversacion: { padding: Espacio.pagina, gap: Espacio.xl, flexGrow: 1 },
    vacio: { gap: Espacio.l, paddingVertical: Espacio.xl },
    vacioTitulo: { fontFamily: Tipos.titular, fontSize: 34, lineHeight: 41, color: c.tinta },
    indice: { borderWidth: 1, borderColor: c.borde, borderRadius: 8, paddingHorizontal: Espacio.l, backgroundColor: c.papelHundido },
    consulta: { flexDirection: 'row', alignItems: 'center', gap: Espacio.m, minHeight: 60, paddingVertical: Espacio.l, borderBottomWidth: 1, borderBottomColor: c.borde },
    numeroConsulta: { fontFamily: Tipos.numeros, fontSize: 12, lineHeight: 20, color: c.acento, minWidth: 24 },
    consultaTexto: { flex: 1, fontFamily: Tipos.textoMedio, fontSize: 14, lineHeight: 23, color: c.tinta },
    consultaPreparada: { backgroundColor: c.asistenteFondo, padding: Espacio.xl, gap: Espacio.m, borderLeftWidth: 3, borderLeftColor: c.asistente, borderRadius: 8 },
    pregunta: { gap: Espacio.s, borderLeftWidth: 3, borderLeftColor: c.marca, padding: Espacio.l, backgroundColor: c.papelHundido, borderRadius: 8 },
    textoUsuario: { fontFamily: Tipos.textoMedio, fontSize: 18, lineHeight: 28, color: c.tinta },
    respuesta: { gap: Espacio.l, paddingVertical: Espacio.s, paddingBottom: Espacio.xl, borderBottomWidth: 1, borderBottomColor: c.borde },
    etiquetaIA: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Espacio.s, alignSelf: 'flex-start', backgroundColor: c.asistenteFondo, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
    identidadIA: { fontFamily: Tipos.textoMedio, fontSize: 12, lineHeight: 19, color: c.asistente },
    textoAsistente: { fontFamily: Tipos.texto, fontSize: 16, lineHeight: 28, color: c.tinta },
    referencias: { gap: Espacio.m, padding: Espacio.l, borderWidth: 1, borderColor: c.borde, backgroundColor: c.papelHundido, borderRadius: 8 },
    fuente: { flexDirection: 'row', alignItems: 'center', gap: Espacio.m, minHeight: 48, paddingVertical: Espacio.s },
    fuenteTitulo: { flex: 1, fontFamily: Tipos.titular, fontSize: 19, lineHeight: 25, color: c.tinta },
    pie: { fontFamily: Tipos.texto, fontSize: 12, lineHeight: 20, color: c.tintaSuave },
    pensando: { flexDirection: 'row', alignItems: 'center', gap: Espacio.s, paddingVertical: Espacio.l },
    error: { backgroundColor: c.alertaFondo, borderLeftWidth: 3, borderLeftColor: c.alerta, borderRadius: 8, padding: Espacio.l, gap: Espacio.s },
    textoError: { fontFamily: Tipos.texto, fontSize: 14, lineHeight: 23, color: c.alertaTexto },
    barraDeEntrada: { flexDirection: 'row', alignItems: 'flex-end', gap: Espacio.m, padding: Espacio.m, borderTopWidth: 1, borderTopColor: c.borde, backgroundColor: c.papel },
    entrada: { flex: 1, minHeight: 50, maxHeight: 140, padding: Espacio.m, borderWidth: 1, borderColor: c.bordeFuerte, borderRadius: 8, fontFamily: Tipos.texto, fontSize: 16, lineHeight: 24, color: c.tinta, backgroundColor: c.papelHundido },
    enviar: { width: 50, height: 50, borderRadius: 8, backgroundColor: c.primario, alignItems: 'center', justifyContent: 'center' },
  });
}
