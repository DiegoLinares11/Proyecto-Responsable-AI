// ===========================================================================
// El perfil
//
// Acá el usuario ve y controla las dos cosas que personalizan su portada: la
// ubicación simulada y los intereses que el sistema le infirió. El enunciado
// pide que el sistema aprenda del comportamiento; lo responsable es que la
// persona pueda ver qué aprendió y borrarlo.
// ===========================================================================

import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AreaDePestana } from '@/componentes/area-de-pestana';

import { BotonGoogle } from '@/componentes/boton-google';
import { Pin } from '@/componentes/iconos';
import { SelectorDeUbicacion } from '@/componentes/selector-de-ubicacion';
import { SelectorDeApariencia } from '@/componentes/selector-de-apariencia';
import { ANCHOS, Espacio, Radio, ROTULO, Tipos, useColores, type Paleta } from '@/constants/tema';
import { FACTORES_GEOGRAFICOS, factorDeInteres, INTERES } from '@/lib/personalizacion';
import { usePreferencias } from '@/lib/preferencias';
import { urlDelServidor } from '@/lib/chat';
import { SECCIONES } from '@/lib/secciones';
import { useSesion } from '@/lib/sesion';
import { useState } from 'react';

// Las preguntas de transparencia del enunciado (R-14): de dónde sale cada
// noticia, cómo se valida, por qué está donde está, qué hace y qué no hace la
// IA, de dónde salen las imágenes y qué se guarda. Cada respuesta describe lo
// que hace el código; si el código cambia, esto cambia con él.
const COMO_FUNCIONA: readonly (readonly [string, string])[] = [
  [
    'De dónde salen las noticias',
    'Las suben periodistas con permiso de publicar, siempre con el enlace al medio original. El registro de medios lo cura el equipo a mano: un medio que no está registrado no se rechaza, lo revisa una persona.',
  ],
  [
    'Cada noticia se valida antes de publicarse',
    'Cinco señales sin inteligencia artificial: la fuente, que el enlace exista y diga lo mismo, que otros medios lo cubran, que ningún verificador la haya desmentido y que la nota sea coherente. Si pasa, el sistema recomienda publicarla, pero el botón lo aprieta una persona: ninguna noticia se publica sola.',
  ],
  [
    'El orden lo decide una fórmula pública',
    'Interacciones, respaldo de cuentas verificadas, credibilidad de la fuente y veracidad, divididas por la antigüedad. Cada noticia explica su lugar en «¿Por qué aparece en tu portada?».',
  ],
  [
    'Qué hace y qué no hace la IA',
    'Solo el asistente usa un modelo de lenguaje. No decide qué es cierto, no ordena tu portada y no genera imágenes. Responde solo con las noticias publicadas, cita de dónde sale cada cosa y puede equivocarse: una respuesta suya no es prueba de que algo sea cierto.',
  ],
  [
    'De dónde salen las imágenes',
    'La foto del medio, una foto de archivo con licencia libre de Wikimedia Commons, rotulada «no es del hecho», o una ilustración tipográfica que no se confunde con una foto. Ninguna imagen se genera con IA.',
  ],
  [
    'Qué se guarda de vos',
    'La ubicación que elegís y qué noticias abrís, para ordenar tu portada. Lo que le preguntás al asistente no se guarda: desaparece al cerrar la conversación.',
  ],
];

export default function Perfil() {
  const c = useColores();
  const e = crearEstilos(c);
  const { sesion, salir } = useSesion();
  const { ubicacion, lecturas, reiniciarIntereses } = usePreferencias();
  const [eligiendo, setEligiendo] = useState(false);

  const intereses = SECCIONES.map((s) => factorDeInteres(s.clave, lecturas))
    .map((f, i) => ({ ...f, nombre: SECCIONES[i]!.nombre }))
    .sort((a, b) => b.valor - a.valor);

  const nombre =
    (sesion?.user.user_metadata?.['full_name'] as string | undefined) ??
    (sesion?.user.user_metadata?.['name'] as string | undefined) ??
    sesion?.user.email ??
    '';

  return (
    <AreaDePestana style={e.pantalla}>
      <ScrollView contentContainerStyle={e.contenido}>
        <Text style={e.titulo} accessibilityRole="header">
          Perfil
        </Text>

        <View style={e.tarjeta}>
          {sesion === null ? (
            <>
              <Text style={e.texto}>Entrá para usar el asistente. La portada se puede leer sin cuenta.</Text>
              <BotonGoogle />
            </>
          ) : (
            <View style={e.fila}>
              <View style={e.avatar}>
                <Text style={e.inicial}>{nombre.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={e.nombre}>{nombre}</Text>
                <Text style={e.correo}>{sesion.user.email}</Text>
              </View>
              <Pressable onPress={salir} accessibilityRole="button">
                <Text style={e.salir}>Salir</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={e.seccion}>APARIENCIA</Text>
        <SelectorDeApariencia />
        <Text style={e.texto}>Elegí cómo querés leer. Sistema sigue la apariencia de tu dispositivo.</Text>

        <Text style={e.seccion}>TU UBICACIÓN</Text>
        <Pressable onPress={() => setEligiendo(true)} style={e.tarjeta} accessibilityRole="button">
          <View style={e.fila}>
            <View style={{ flex: 1 }}>
              <View style={e.filaPin}>
                <Pin color={c.acento} tamano={16} />
                <Text style={e.nombre}>{ubicacion.nombre}</Text>
              </View>
              <Text style={e.texto}>Simulada: la elegís vos.</Text>
            </View>
            <Text style={e.cambiar}>Cambiar</Text>
          </View>
        </Pressable>
        <SelectorDeUbicacion visible={eligiendo} cerrar={() => setEligiendo(false)} />

        <Text style={e.seccion}>LO QUE EL SISTEMA CREE QUE TE INTERESA</Text>
        <View style={e.tarjeta}>
          {sesion === null ? (
            <Text style={e.texto}>Entrá para que la portada aprenda de lo que leés.</Text>
          ) : lecturas.length === 0 ? (
            <Text style={e.texto}>
              Todavía nada: con cero lecturas todas las secciones pesan lo mismo. Cada noticia que abrís
              cuenta.
            </Text>
          ) : (
            <>
              {intereses.map((i) => (
                <View key={i.seccion} style={e.interes}>
                  <Text style={e.interesNombre}>{i.nombre}</Text>
                  <View style={e.barraFondo}>
                    <View
                      style={[
                        e.barra,
                        {
                          width: `${((i.valor - INTERES.minimo) / (INTERES.maximo - INTERES.minimo)) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={e.interesValor}>×{i.valor.toFixed(2)}</Text>
                </View>
              ))}
              <Text style={e.notaPequena}>
                Sale de las {lecturas.length} noticias que abriste en los últimos 30 días. El chat no cuenta.
              </Text>
              <Pressable onPress={reiniciarIntereses} accessibilityRole="button">
                <Text style={e.reiniciar}>Reiniciar intereses</Text>
              </Pressable>
            </>
          )}
        </View>

        <Text style={e.seccion}>CÓMO SE ORDENA TU PORTADA</Text>
        <View style={e.tarjeta}>
          <Text style={e.formula}>relevancia × ubicación × interés</Text>
          <Text style={e.texto}>
            De tu zona ×{FACTORES_GEOGRAFICOS.tu_zona}. Nacional ×{FACTORES_GEOGRAFICOS.tu_pais}.
            Internacional ×{FACTORES_GEOGRAFICOS.internacional}. Local de otra zona ×
            {FACTORES_GEOGRAFICOS.otra_zona}. El interés va de ×{INTERES.minimo} a ×{INTERES.maximo}.
          </Text>
          <Text style={e.texto}>
            Y dos garantías que ninguna preferencia saca: lo más importante del día está entre las tres
            primeras para todos, y entre las seis primeras hay algo local, algo nacional y algo
            internacional, siempre que haya noticias de cada tipo.
          </Text>
        </View>

        <Text style={e.seccion}>CÓMO FUNCIONA</Text>
        {COMO_FUNCIONA.map(([titulo, texto]) => (
          <View key={titulo} style={e.punto}>
            <Text style={e.puntoTitulo}>{titulo}</Text>
            <Text style={e.texto}>{texto}</Text>
          </View>
        ))}
        <Pressable
          onPress={() => WebBrowser.openBrowserAsync(`${urlDelServidor()}/privacidad`)}
          accessibilityRole="link"
          style={({ pressed }) => [e.punto, pressed && { opacity: 0.65 }]}>
          <Text style={[e.puntoTitulo, { color: c.acento }]}>Leer la política de privacidad ↗</Text>
        </Pressable>

        <Text style={e.pie}>Proyecto de CC3106{'\n'}Universidad del Valle de Guatemala</Text>
      </ScrollView>
    </AreaDePestana>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.papel },
    contenido: { padding: Espacio.xl, gap: Espacio.l, paddingBottom: 64, width: '100%', maxWidth: ANCHOS.conversacion, alignSelf: 'center' },
    titulo: { fontFamily: Tipos.titular, fontSize: 32, lineHeight: 40, letterSpacing: -0.8, color: c.tinta, paddingVertical: Espacio.m, paddingBottom: Espacio.xl, borderBottomWidth: 1, borderBottomColor: c.borde },
    seccion: { ...ROTULO, color: c.acento, marginTop: Espacio.xl },
    tarjeta: { backgroundColor: c.papelHundido, borderColor: c.borde, borderWidth: 1, borderRadius: Radio.medio, padding: Espacio.xl, gap: Espacio.l },
    fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Espacio.m },
    filaPin: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    avatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: c.primario, alignItems: 'center', justifyContent: 'center' },
    inicial: { color: c.sobrePrimario, fontSize: 22, fontFamily: Tipos.textoFuerte },
    nombre: { fontFamily: Tipos.textoFuerte, fontSize: 17, lineHeight: 25, color: c.tinta, flexShrink: 1 },
    correo: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 21, color: c.tintaSuave },
    salir: { fontFamily: Tipos.textoMedio, fontSize: 14, lineHeight: 22, color: c.peligro, padding: Espacio.m, minHeight: 48 },
    cambiar: { fontFamily: Tipos.textoMedio, fontSize: 14, lineHeight: 22, color: c.acento, paddingVertical: Espacio.m },
    interes: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Espacio.s, paddingVertical: 4 },
    interesNombre: { width: 92, fontFamily: Tipos.texto, fontSize: 13, lineHeight: 21, color: c.tinta },
    barraFondo: { flex: 1, minWidth: 40, height: 6, borderRadius: 3, backgroundColor: c.borde, overflow: 'hidden' },
    barra: { height: 6, borderRadius: 3, backgroundColor: c.asistente },
    interesValor: { width: 48, textAlign: 'right', fontFamily: Tipos.numeros, fontSize: 12, lineHeight: 20, color: c.tinta },
    notaPequena: { fontFamily: Tipos.texto, fontSize: 12, lineHeight: 20, color: c.tintaSuave },
    reiniciar: { fontFamily: Tipos.textoMedio, fontSize: 14, lineHeight: 23, color: c.peligro, paddingVertical: Espacio.m, minHeight: 48 },
    formula: { fontFamily: Tipos.numeros, fontSize: 16, lineHeight: 26, color: c.tinta },
    texto: { fontFamily: Tipos.texto, fontSize: 14, lineHeight: 24, color: c.tintaSuave },
    punto: { gap: Espacio.s, paddingVertical: Espacio.l, borderBottomWidth: 1, borderBottomColor: c.borde },
    puntoTitulo: { fontFamily: Tipos.titular, fontSize: 22, lineHeight: 29, color: c.tinta },
    pie: { fontFamily: Tipos.texto, fontSize: 12, lineHeight: 20, color: c.tintaTenue, textAlign: 'center', marginTop: Espacio.xl },
  });
}
