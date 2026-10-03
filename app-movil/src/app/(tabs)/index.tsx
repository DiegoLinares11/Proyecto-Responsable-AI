// ===========================================================================
// El chat: la pantalla inicial
//
// La conversación vive en el estado de esta pantalla y se pierde al cerrar la
// app. Lo que guarda el servidor es otra cosa —la bitácora de cada turno— y no
// se promete acá lo contrario: una pantalla que dice «no se guarda» mientras el
// servidor guarda es justo el tipo de afirmación sin respaldo que el informe
// prohíbe (§9).
// ===========================================================================

import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonGoogle } from '@/componentes/boton-google';
import { Espacio, Tipos, useColores, type Paleta } from '@/constants/tema';
import { preguntar } from '@/lib/chat';
import { titulosDe } from '@/lib/noticias';
import { usePreferencias } from '@/lib/preferencias';
import { useSesion } from '@/lib/sesion';

type Turno =
  | { id: string; rol: 'usuario'; texto: string }
  | {
      id: string;
      rol: 'asistente';
      texto: string;
      bloqueado: boolean;
      confianza: 'alta' | 'media' | 'baja' | null;
      citadas: { id: string; titulo: string }[];
    }
  | { id: string; rol: 'error'; texto: string };

// Las cuatro consultas que el enunciado pide que el chat resuelva: lo reciente,
// lo de la región simulada, lo de otro país y un tema de las noticias.
function sugerencias(zona: string): string[] {
  return [
    'Resumime lo más reciente',
    `¿Qué está pasando en ${zona}?`,
    'Explicame lo más importante del mundo hoy',
    '¿Qué se sabe de la tasa de interés?',
  ];
}

const NOMBRE_DE_CONFIANZA = { alta: 'confianza alta', media: 'confianza media', baja: 'confianza baja' };

export default function Chat() {
  const c = useColores();
  const e = crearEstilos(c);
  const { sesion, cargando } = useSesion();
  const { ubicacion } = usePreferencias();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [borrador, setBorrador] = useState('');
  const [pensando, setPensando] = useState(false);
  const lista = useRef<FlatList<Turno>>(null);

  async function enviar(texto: string) {
    const mensaje = texto.trim();
    if (mensaje === '' || pensando) return;

    setBorrador('');
    setTurnos((t) => [...t, { id: `u${Date.now()}`, rol: 'usuario', texto: mensaje }]);
    setPensando(true);

    try {
      const r = await preguntar(mensaje, ubicacion.id);
      const titulos = await titulosDe(r.noticiasCitadas ?? []);
      setTurnos((t) => [
        ...t,
        {
          id: `a${Date.now()}`,
          rol: 'asistente',
          texto: r.respuesta,
          bloqueado: r.bloqueado,
          confianza: r.confianza,
          citadas: (r.noticiasCitadas ?? [])
            .filter((id) => titulos.has(id))
            .map((id) => ({ id, titulo: titulos.get(id)! })),
        },
      ]);
    } catch (error) {
      setTurnos((t) => [
        ...t,
        { id: `e${Date.now()}`, rol: 'error', texto: error instanceof Error ? error.message : String(error) },
      ]);
    } finally {
      setPensando(false);
    }
  }

  if (cargando) {
    return (
      <SafeAreaView style={[e.pantalla, e.centro]}>
        <ActivityIndicator color={c.acento} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={e.pantalla} edges={['top']}>
      <View style={e.cabecera}>
        <Text style={e.marca}>Noticias Verificadas</Text>
        <Text style={e.lema}>Preguntá sobre las noticias publicadas</Text>
      </View>

      {sesion === null ? (
        <View style={[e.centro, e.bienvenida]}>
          <Text style={e.tituloBienvenida}>Un asistente que solo habla de lo que está verificado</Text>
          <Text style={e.textoBienvenida}>
            Responde con las noticias de la plataforma y te dice de qué medio sale cada cosa. Si algo no
            está confirmado, te lo dice.
          </Text>
          <BotonGoogle />
          <Pressable onPress={() => router.push('/feed')}>
            <Text style={e.enlace}>La portada se puede leer sin cuenta →</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
          <FlatList
            ref={lista}
            data={turnos}
            keyExtractor={(t) => t.id}
            contentContainerStyle={e.conversacion}
            onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={e.vacio}>
                <Text style={e.vacioTitulo}>¿Qué querés saber?</Text>
                <View style={e.sugerencias}>
                  {sugerencias(ubicacion.nombre).map((s) => (
                    <Pressable key={s} onPress={() => enviar(s)} style={e.sugerencia}>
                      <Text style={e.sugerenciaTexto}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            }
            ListFooterComponent={
              pensando ? (
                <View style={[e.burbuja, e.burbujaAsistente, e.pensando]}>
                  <ActivityIndicator size="small" color={c.tintaSuave} />
                  <Text style={e.pie}>Buscando en las noticias publicadas…</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => <Burbuja turno={item} e={e} />}
          />

          <View style={e.barraDeEntrada}>
            <TextInput
              value={borrador}
              onChangeText={setBorrador}
              placeholder="Preguntá sobre las noticias…"
              placeholderTextColor={c.tintaTenue}
              style={e.entrada}
              multiline
              maxLength={2000}
              onSubmitEditing={() => enviar(borrador)}
            />
            <Pressable
              onPress={() => enviar(borrador)}
              disabled={pensando || borrador.trim() === ''}
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              style={[e.enviar, { opacity: pensando || borrador.trim() === '' ? 0.4 : 1 }]}>
              <Text style={e.enviarTexto}>↑</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function Burbuja({ turno, e }: { turno: Turno; e: ReturnType<typeof crearEstilos> }) {
  if (turno.rol === 'usuario') {
    return (
      <View style={[e.burbuja, e.burbujaUsuario]}>
        <Text style={e.textoUsuario}>{turno.texto}</Text>
      </View>
    );
  }

  if (turno.rol === 'error') {
    return (
      <View style={[e.burbuja, e.burbujaError]}>
        <Text style={e.textoError}>{turno.texto}</Text>
      </View>
    );
  }

  return (
    <View style={[e.burbuja, e.burbujaAsistente, turno.bloqueado ? e.burbujaBloqueada : null]}>
      <Text style={e.textoAsistente}>{turno.texto}</Text>

      {turno.citadas.length > 0 ? (
        <View style={e.fuentes}>
          <Text style={e.fuentesTitulo}>FUENTES</Text>
          {turno.citadas.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => router.push({ pathname: '/noticia/[id]', params: { id: n.id } })}
              style={e.fuente}>
              <Text style={e.fuenteTexto} numberOfLines={2}>
                {n.titulo}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Que se vea quién escribió esto: el enunciado pide distinguir lo
          generado por IA de lo que publicó un medio. */}
      <Text style={e.pie}>
        Respuesta generada por IA
        {turno.confianza ? ` · ${NOMBRE_DE_CONFIANZA[turno.confianza]}` : ''}
      </Text>
    </View>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.papel },
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    cabecera: {
      paddingHorizontal: Espacio.l,
      paddingTop: Espacio.s,
      paddingBottom: Espacio.m,
      borderBottomWidth: 2,
      borderBottomColor: c.tinta,
    },
    marca: { fontFamily: Tipos.titulares, fontSize: 22, fontWeight: '700', color: c.tinta },
    lema: { fontFamily: Tipos.texto, fontSize: 13, color: c.tintaSuave, marginTop: 2 },

    bienvenida: { paddingHorizontal: Espacio.xl, gap: Espacio.l },
    tituloBienvenida: {
      fontFamily: Tipos.titulares,
      fontSize: 24,
      fontWeight: '700',
      color: c.tinta,
      textAlign: 'center',
    },
    textoBienvenida: {
      fontFamily: Tipos.texto,
      fontSize: 15,
      lineHeight: 22,
      color: c.tintaSuave,
      textAlign: 'center',
    },
    enlace: { fontFamily: Tipos.texto, fontSize: 14, color: c.acento, marginTop: Espacio.s },

    conversacion: { padding: Espacio.l, gap: Espacio.m, flexGrow: 1 },
    vacio: { flex: 1, justifyContent: 'flex-end', gap: Espacio.m, paddingBottom: Espacio.l },
    vacioTitulo: { fontFamily: Tipos.titulares, fontSize: 22, fontWeight: '700', color: c.tinta },
    sugerencias: { gap: Espacio.s },
    sugerencia: {
      borderWidth: 1,
      borderColor: c.borde,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: c.papelHundido,
    },
    sugerenciaTexto: { fontFamily: Tipos.texto, fontSize: 15, color: c.tinta },

    burbuja: { maxWidth: '88%', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 },
    burbujaUsuario: { alignSelf: 'flex-end', backgroundColor: c.acento, borderBottomRightRadius: 4 },
    burbujaAsistente: { alignSelf: 'flex-start', backgroundColor: c.papelHundido, borderBottomLeftRadius: 4 },
    burbujaBloqueada: { borderLeftWidth: 3, borderLeftColor: c.alerta },
    burbujaError: { alignSelf: 'flex-start', backgroundColor: c.peligro + '18' },
    pensando: { flexDirection: 'row', alignItems: 'center', gap: Espacio.s },
    textoUsuario: { fontFamily: Tipos.texto, fontSize: 15, lineHeight: 21, color: c.sobreAcento },
    textoAsistente: { fontFamily: Tipos.texto, fontSize: 15, lineHeight: 22, color: c.tinta },
    textoError: { fontFamily: Tipos.texto, fontSize: 14, lineHeight: 20, color: c.peligro },

    fuentes: { marginTop: Espacio.m, gap: 6 },
    fuentesTitulo: {
      fontFamily: Tipos.texto,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      color: c.tintaTenue,
    },
    fuente: {
      borderLeftWidth: 2,
      borderLeftColor: c.acento,
      paddingLeft: 8,
      paddingVertical: 2,
    },
    fuenteTexto: { fontFamily: Tipos.titulares, fontSize: 14, color: c.acento },
    pie: { fontFamily: Tipos.texto, fontSize: 11, color: c.tintaTenue, marginTop: Espacio.s },

    barraDeEntrada: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Espacio.s,
      paddingHorizontal: Espacio.m,
      paddingVertical: Espacio.s,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borde,
      backgroundColor: c.papel,
    },
    entrada: {
      flex: 1,
      minHeight: 42,
      maxHeight: 120,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: c.borde,
      paddingHorizontal: 16,
      paddingTop: 11,
      paddingBottom: 11,
      fontFamily: Tipos.texto,
      fontSize: 15,
      color: c.tinta,
      backgroundColor: c.papelHundido,
    },
    enviar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.acento,
      alignItems: 'center',
      justifyContent: 'center',
    },
    enviarTexto: { color: c.sobreAcento, fontSize: 20, fontWeight: '800' },
  });
}
