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
import { Enviar, Pin } from '@/componentes/iconos';
import { Logotipo, SelloMarca } from '@/componentes/marca';
import { Espacio, Radio, ROTULO, Tipos, useColores, type Paleta } from '@/constants/tema';
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

const NOMBRE_DE_CONFIANZA = { alta: 'Confianza alta', media: 'Confianza media', baja: 'Confianza baja' };

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
        <SelloMarca tamano={30} />
        <View style={{ flex: 1 }}>
          <Text style={e.titulo} accessibilityRole="header">
            Asistente
          </Text>
          <Text style={e.lema}>Responde solo con noticias verificadas</Text>
        </View>
        <View style={e.zona}>
          <Pin color={c.acento} tamano={12} />
          <Text style={e.zonaTexto} numberOfLines={1}>
            {ubicacion.nombre}
          </Text>
        </View>
      </View>

      {sesion === null ? (
        <View style={[e.centro, e.bienvenida]}>
          <Logotipo grande />
          <Text style={e.tituloBienvenida}>Un asistente que solo habla de lo que está verificado</Text>
          <Text style={e.textoBienvenida}>
            Responde con las noticias de la plataforma y te dice de qué medio sale cada cosa. Si algo no
            está confirmado, te lo dice.
          </Text>
          <View style={{ alignSelf: 'stretch' }}>
            <BotonGoogle />
          </View>
          <Pressable onPress={() => router.push('/feed')} style={e.enlaceToque} accessibilityRole="link">
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
                    <Pressable key={s} onPress={() => enviar(s)} style={e.sugerencia} accessibilityRole="button">
                      <Text style={e.sugerenciaTexto}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            }
            ListFooterComponent={
              pensando ? (
                <View style={e.pensando}>
                  <ActivityIndicator size="small" color={c.tintaSuave} />
                  <Text style={e.pie}>Buscando en las noticias publicadas…</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => <Mensaje turno={item} e={e} />}
          />

          <View style={e.barraDeEntrada}>
            <TextInput
              value={borrador}
              onChangeText={setBorrador}
              placeholder="Preguntá sobre las noticias…"
              placeholderTextColor={c.tintaTenue}
              accessibilityLabel="Tu pregunta"
              style={e.entrada}
              multiline
              maxLength={2000}
              onSubmitEditing={() => enviar(borrador)}
            />
            <Pressable
              onPress={() => enviar(borrador)}
              disabled={pensando || borrador.trim() === ''}
              accessibilityRole="button"
              accessibilityLabel="Enviar pregunta"
              style={[e.enviar, { opacity: pensando || borrador.trim() === '' ? 0.35 : 1 }]}>
              <Enviar color={c.sobrePrimario} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function Mensaje({ turno, e }: { turno: Turno; e: ReturnType<typeof crearEstilos> }) {
  if (turno.rol === 'usuario') {
    return (
      <View style={e.burbujaUsuario}>
        <Text style={e.textoUsuario}>{turno.texto}</Text>
      </View>
    );
  }

  if (turno.rol === 'error') {
    return (
      <View style={e.error}>
        <Text style={e.textoError}>{turno.texto}</Text>
      </View>
    );
  }

  // Lo que escribe la IA no va en una burbuja como si fuera una persona: va con
  // su etiqueta, en cursiva, y con las noticias de las que sale.
  return (
    <View style={e.respuesta}>
      <View style={e.firmaIA}>
        <Text style={e.etiquetaIA}>IA</Text>
        <Text style={e.firmaTexto}>
          {turno.bloqueado ? 'Respuesta limitada por las defensas' : 'Respuesta generada · cita sus fuentes'}
        </Text>
      </View>

      <Text style={e.textoAsistente}>{turno.texto}</Text>

      {turno.citadas.map((n) => (
        <Pressable
          key={n.id}
          onPress={() => router.push({ pathname: '/noticia/[id]', params: { id: n.id } })}
          style={e.fuente}
          accessibilityRole="link">
          <Text style={e.fuenteRotulo}>{turno.citadas.length > 1 ? 'FUENTE CITADA' : 'FUENTE'}</Text>
          <Text style={e.fuenteTitulo} numberOfLines={3}>
            {n.titulo}
          </Text>
        </Pressable>
      ))}

      <Text style={e.pie}>
        {turno.confianza ? `${NOMBRE_DE_CONFIANZA[turno.confianza]}. ` : ''}Puede equivocarse: una respuesta
        suya no prueba que algo sea cierto.
      </Text>
    </View>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.papel },
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    cabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: Espacio.l,
      paddingTop: Espacio.s,
      paddingBottom: Espacio.m,
      borderBottomWidth: 1,
      borderBottomColor: c.borde,
    },
    titulo: { fontFamily: Tipos.titular, fontSize: 21, lineHeight: 24, color: c.tinta },
    lema: { fontFamily: Tipos.texto, fontSize: 12, color: c.tintaSuave },
    zona: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 140 },
    zonaTexto: { fontFamily: Tipos.textoMedio, fontSize: 12, color: c.acento, flexShrink: 1 },

    bienvenida: { paddingHorizontal: Espacio.xl, gap: Espacio.l },
    tituloBienvenida: {
      fontFamily: Tipos.titular,
      fontSize: 24,
      lineHeight: 29,
      color: c.tinta,
      textAlign: 'center',
      marginTop: Espacio.s,
    },
    textoBienvenida: {
      fontFamily: Tipos.texto,
      fontSize: 15,
      lineHeight: 22,
      color: c.tintaSuave,
      textAlign: 'center',
    },
    enlaceToque: { minHeight: 44, justifyContent: 'center' },
    enlace: { fontFamily: Tipos.textoMedio, fontSize: 14, color: c.acento },

    conversacion: { padding: Espacio.l, gap: Espacio.l, flexGrow: 1 },
    vacio: { flex: 1, justifyContent: 'flex-end', gap: Espacio.m, paddingBottom: Espacio.s },
    vacioTitulo: { fontFamily: Tipos.titular, fontSize: 24, color: c.tinta },
    sugerencias: { flexDirection: 'row', flexWrap: 'wrap', gap: Espacio.s },
    sugerencia: {
      minHeight: 44,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.bordeFuerte,
      borderRadius: 22,
      paddingHorizontal: 14,
    },
    sugerenciaTexto: { fontFamily: Tipos.textoMedio, fontSize: 14, color: c.tinta },

    burbujaUsuario: {
      alignSelf: 'flex-end',
      maxWidth: '82%',
      backgroundColor: c.primario,
      borderRadius: 14,
      borderBottomRightRadius: 3,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    textoUsuario: { fontFamily: Tipos.texto, fontSize: 15, lineHeight: 21, color: c.sobrePrimario },

    respuesta: { alignSelf: 'flex-start', maxWidth: '94%', gap: 10 },
    firmaIA: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    etiquetaIA: {
      fontFamily: Tipos.numeros,
      fontSize: 10,
      letterSpacing: 0.8,
      color: c.tinta,
      borderWidth: 1,
      borderColor: c.tinta,
      borderRadius: Radio.chico,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    firmaTexto: { fontFamily: Tipos.textoMedio, fontSize: 11, color: c.tintaSuave },
    textoAsistente: { fontFamily: Tipos.textoCursiva, fontSize: 15, lineHeight: 23, color: c.tinta },

    fuente: { backgroundColor: c.papelHundido, borderRadius: Radio.medio, padding: Espacio.m, gap: 6 },
    fuenteRotulo: { ...ROTULO, fontSize: 10, color: c.tintaSuave },
    fuenteTitulo: { fontFamily: Tipos.titular, fontSize: 16, lineHeight: 20, color: c.tinta },
    pie: { fontFamily: Tipos.texto, fontSize: 12, lineHeight: 17, color: c.tintaSuave },

    pensando: { flexDirection: 'row', alignItems: 'center', gap: Espacio.s },
    error: {
      alignSelf: 'flex-start',
      maxWidth: '94%',
      backgroundColor: c.alertaFondo,
      borderRadius: Radio.medio,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    textoError: { fontFamily: Tipos.texto, fontSize: 14, lineHeight: 20, color: c.alertaTexto },

    barraDeEntrada: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Espacio.s,
      paddingHorizontal: Espacio.m,
      paddingVertical: Espacio.s,
      borderTopWidth: 1,
      borderTopColor: c.borde,
      backgroundColor: c.papel,
    },
    entrada: {
      flex: 1,
      minHeight: 46,
      maxHeight: 120,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: c.borde,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      fontFamily: Tipos.texto,
      fontSize: 15,
      color: c.tinta,
      backgroundColor: c.papelHundido,
    },
    enviar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: c.primario,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
