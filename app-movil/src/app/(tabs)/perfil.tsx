// ===========================================================================
// El perfil
//
// La ubicación simulada todavía no existe en la base. Esta pantalla no muestra
// un selector que no haga nada: un control decorativo promete algo que el
// sistema no cumple. Llega con la personalización.
// ===========================================================================

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonGoogle } from '@/componentes/boton-google';
import { Espacio, Tipos, useColores, type Paleta } from '@/constants/tema';
import { useSesion } from '@/lib/sesion';

const COMO_FUNCIONA: readonly (readonly [string, string])[] = [
  [
    'Cada noticia se valida antes de publicarse',
    'Cinco señales sin inteligencia artificial: la fuente, que el enlace exista y diga lo mismo, que otros medios lo cubran, que no haya desmentidos y que la nota sea coherente.',
  ],
  [
    'El orden lo decide una fórmula pública',
    'Interacciones, respaldo de cuentas verificadas, credibilidad de la fuente y veracidad, divididas por la antigüedad. Cada noticia explica su lugar.',
  ],
  [
    'El asistente solo habla de lo publicado',
    'Responde con las noticias verificadas y cita de dónde sale cada cosa. Puede equivocarse: una respuesta suya no es prueba de que algo sea cierto.',
  ],
];

export default function Perfil() {
  const c = useColores();
  const e = crearEstilos(c);
  const { sesion, salir } = useSesion();

  const nombre =
    (sesion?.user.user_metadata?.['full_name'] as string | undefined) ??
    (sesion?.user.user_metadata?.['name'] as string | undefined) ??
    sesion?.user.email ??
    '';

  return (
    <SafeAreaView style={e.pantalla} edges={['top']}>
      <ScrollView contentContainerStyle={e.contenido}>
        <Text style={e.titulo}>Perfil</Text>

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

        <Text style={e.seccion}>TU UBICACIÓN</Text>
        <View style={e.tarjeta}>
          <Text style={e.texto}>
            La ubicación simulada y la personalización del feed llegan en la próxima entrega. Hasta
            entonces la portada es la misma para todos, y lo dice.
          </Text>
        </View>

        <Text style={e.seccion}>CÓMO FUNCIONA</Text>
        {COMO_FUNCIONA.map(([titulo, texto]) => (
          <View key={titulo} style={e.punto}>
            <Text style={e.puntoTitulo}>{titulo}</Text>
            <Text style={e.texto}>{texto}</Text>
          </View>
        ))}

        <Text style={e.pie}>Proyecto de CC3106 · Universidad del Valle de Guatemala</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.papel },
    contenido: { padding: Espacio.l, gap: Espacio.m, paddingBottom: 48 },
    titulo: { fontFamily: Tipos.titulares, fontSize: 34, fontWeight: '700', color: c.tinta },
    seccion: {
      fontFamily: Tipos.texto,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: c.tintaSuave,
      marginTop: Espacio.m,
    },
    tarjeta: {
      backgroundColor: c.papelHundido,
      borderRadius: 14,
      padding: Espacio.l,
      gap: Espacio.m,
    },
    fila: { flexDirection: 'row', alignItems: 'center', gap: Espacio.m },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.acento,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inicial: { color: c.sobreAcento, fontSize: 18, fontWeight: '700' },
    nombre: { fontFamily: Tipos.texto, fontSize: 16, fontWeight: '700', color: c.tinta },
    correo: { fontFamily: Tipos.texto, fontSize: 13, color: c.tintaSuave },
    salir: { fontFamily: Tipos.texto, fontSize: 15, color: c.peligro, fontWeight: '600' },
    texto: { fontFamily: Tipos.texto, fontSize: 14, lineHeight: 20, color: c.tintaSuave },
    punto: { gap: 4, paddingVertical: Espacio.s },
    puntoTitulo: { fontFamily: Tipos.titulares, fontSize: 17, fontWeight: '700', color: c.tinta },
    pie: {
      fontFamily: Tipos.texto,
      fontSize: 12,
      color: c.tintaTenue,
      textAlign: 'center',
      marginTop: Espacio.xl,
    },
  });
}
