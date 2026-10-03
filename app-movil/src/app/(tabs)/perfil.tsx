// ===========================================================================
// El perfil
//
// Acá el usuario ve y controla las dos cosas que personalizan su portada: la
// ubicación simulada y los intereses que el sistema le infirió. El enunciado
// pide que el sistema aprenda del comportamiento; lo responsable es que la
// persona pueda ver qué aprendió y borrarlo.
// ===========================================================================

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonGoogle } from '@/componentes/boton-google';
import { Espacio, Tipos, useColores, type Paleta } from '@/constants/tema';
import { SelectorDeUbicacion } from '@/componentes/selector-de-ubicacion';
import { FACTORES_GEOGRAFICOS, factorDeInteres, INTERES } from '@/lib/personalizacion';
import { usePreferencias } from '@/lib/preferencias';
import { SECCIONES } from '@/lib/secciones';
import { useSesion } from '@/lib/sesion';
import { useState } from 'react';

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
        <Pressable onPress={() => setEligiendo(true)} style={e.tarjeta} accessibilityRole="button">
          <View style={e.fila}>
            <View style={{ flex: 1 }}>
              <Text style={e.nombre}>📍 {ubicacion.nombre}</Text>
              <Text style={e.texto}>Simulada: no se usa el GPS.</Text>
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
            De tu zona ×{FACTORES_GEOGRAFICOS.tu_zona} · nacional ×{FACTORES_GEOGRAFICOS.tu_pais} ·
            internacional ×{FACTORES_GEOGRAFICOS.internacional} · local de otra zona ×
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
    cambiar: { fontFamily: Tipos.texto, fontSize: 15, color: c.acento, fontWeight: '600' },
    interes: { flexDirection: 'row', alignItems: 'center', gap: Espacio.s },
    interesNombre: { width: 92, fontFamily: Tipos.texto, fontSize: 13, color: c.tinta },
    barraFondo: { flex: 1, height: 6, borderRadius: 3, backgroundColor: c.borde, overflow: 'hidden' },
    barra: { height: 6, borderRadius: 3, backgroundColor: c.acento },
    interesValor: { width: 44, textAlign: 'right', fontFamily: Tipos.texto, fontSize: 12, color: c.tintaSuave },
    notaPequena: { fontFamily: Tipos.texto, fontSize: 12, color: c.tintaTenue },
    reiniciar: { fontFamily: Tipos.texto, fontSize: 14, color: c.peligro, fontWeight: '600' },
    formula: { fontFamily: Tipos.titulares, fontSize: 17, fontWeight: '700', color: c.tinta },
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
