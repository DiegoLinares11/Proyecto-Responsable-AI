// Las piezas de los formularios de la redacción, con la identidad de la app:
// rectas, en tinta, y con objetivos táctiles de al menos 44 px.

import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Espacio, Radio, ROTULO, Tipos, useColores } from '@/constants/tema';

export function Entrada({
  etiqueta,
  pista,
  ...props
}: TextInputProps & { etiqueta: string; pista?: string }) {
  const c = useColores();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[estilos.etiqueta, { color: c.tinta }]}>
        {etiqueta}
        {pista ? <Text style={{ color: c.tintaTenue, fontFamily: Tipos.texto }}>  {pista}</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={c.tintaTenue}
        accessibilityLabel={etiqueta}
        {...props}
        style={[
          estilos.entrada,
          { borderColor: c.bordeFuerte, color: c.tinta, backgroundColor: c.papel },
          props.multiline ? { minHeight: 96, textAlignVertical: 'top', paddingTop: 10 } : null,
        ]}
      />
    </View>
  );
}

export function Opciones<T extends string>({
  etiqueta,
  opciones,
  valor,
  cambiar,
}: {
  etiqueta?: string;
  opciones: readonly { valor: T; nombre: string }[];
  valor: T;
  cambiar: (v: T) => void;
}) {
  const c = useColores();
  return (
    <View style={{ gap: 6 }}>
      {etiqueta ? <Text style={[estilos.etiqueta, { color: c.tinta }]}>{etiqueta}</Text> : null}
      <View style={estilos.fila} accessibilityRole="radiogroup">
        {opciones.map((o) => {
          const elegida = o.valor === valor;
          return (
            <Pressable
              key={o.valor}
              onPress={() => cambiar(o.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: elegida }}
              style={[
                estilos.opcion,
                elegida
                  ? { backgroundColor: c.verificadoFondo, borderColor: c.acento }
                  : { backgroundColor: c.papel, borderColor: c.bordeFuerte },
              ]}>
              <Text style={[estilos.opcionTexto, { color: elegida ? c.acento : c.tinta }]}>{o.nombre}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Boton({
  texto,
  alPresionar,
  ocupado = false,
  desactivado = false,
  secundario = false,
  peligro = false,
}: {
  texto: string;
  alPresionar: () => void;
  ocupado?: boolean;
  desactivado?: boolean;
  secundario?: boolean;
  peligro?: boolean;
}) {
  const c = useColores();
  const fondo = secundario ? c.papel : c.primario;
  const tinta = secundario ? (peligro ? c.peligro : c.tinta) : c.sobrePrimario;
  return (
    <Pressable
      onPress={alPresionar}
      disabled={desactivado || ocupado}
      accessibilityRole="button"
      style={({ pressed }) => [
        estilos.boton,
        { backgroundColor: fondo, borderColor: secundario ? (peligro ? c.peligro : c.tinta) : fondo },
        { opacity: desactivado ? 0.4 : pressed ? 0.75 : 1 },
      ]}>
      {ocupado ? <ActivityIndicator color={tinta} /> : <Text style={[estilos.botonTexto, { color: tinta }]}>{texto}</Text>}
    </Pressable>
  );
}

export function Mensaje({ resultado }: { resultado: { error: string } | { ok: string } | null }) {
  const c = useColores();
  if (resultado === null) return null;
  const error = 'error' in resultado;
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={[
        estilos.mensaje,
        error ? { backgroundColor: c.alertaFondo, color: c.alertaTexto } : { backgroundColor: c.verificadoFondo, color: c.verificado },
      ]}>
      {error ? resultado.error : resultado.ok}
    </Text>
  );
}

export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  const c = useColores();
  return (
    <View style={{ gap: Espacio.m }}>
      <Text style={[ROTULO, { color: c.acento }]}>{titulo}</Text>
      {children}
    </View>
  );
}

export function Tarjeta({ children }: { children: ReactNode }) {
  const c = useColores();
  return <View style={[estilos.tarjeta, { borderColor: c.borde, backgroundColor: c.papel }]}>{children}</View>;
}

const estilos = StyleSheet.create({
  etiqueta: { fontFamily: Tipos.textoMedio, fontSize: 14 },
  entrada: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: Radio.medio,
    paddingHorizontal: 12,
    fontFamily: Tipos.texto,
    fontSize: 15,
  },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderRadius: Radio.medio },
  opcionTexto: { fontFamily: Tipos.textoMedio, fontSize: 14 },
  boton: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: Radio.medio,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonTexto: { fontFamily: Tipos.textoMedio, fontSize: 15 },
  mensaje: { fontFamily: Tipos.texto, fontSize: 14, lineHeight: 20, padding: 12, borderRadius: Radio.medio, overflow: 'hidden' },
  tarjeta: { borderWidth: 1, borderRadius: Radio.medio, padding: Espacio.m, gap: Espacio.s },
});
