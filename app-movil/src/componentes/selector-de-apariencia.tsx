import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radio, Tipos, useColores } from '@/constants/tema';
import { useApariencia } from '@/lib/apariencia';
import { Luna, Pantalla, Sol } from './iconos';

const OPCIONES = [
  { valor: 'claro', nombre: 'Claro', Icono: Sol },
  { valor: 'oscuro', nombre: 'Oscuro', Icono: Luna },
  { valor: 'sistema', nombre: 'Sistema', Icono: Pantalla },
] as const;

export function SelectorDeApariencia() {
  const c = useColores();
  const { apariencia, cambiar } = useApariencia();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Apariencia" style={[estilos.grupo, { borderColor: c.borde }]}>
      {OPCIONES.map(({ valor, nombre, Icono }) => {
        const activa = apariencia === valor;
        const color = activa ? c.tinta : c.tintaSuave;
        return (
          <Pressable
            key={valor}
            onPress={() => cambiar(valor)}
            accessibilityRole="radio"
            accessibilityState={{ checked: activa }}
            aria-checked={activa}
            accessibilityLabel={`Tema ${nombre.toLowerCase()}`}
            style={({ pressed }) => [estilos.opcion, { backgroundColor: activa ? c.papelHundido : 'transparent', opacity: pressed ? 0.65 : 1 }]}>
            <View aria-hidden><Icono color={color} /></View>
            <Text style={[estilos.texto, { color, fontFamily: activa ? Tipos.textoMedio : Tipos.texto }]}>{nombre}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderRadius: Radio.medio, padding: 4, gap: 4, alignSelf: 'flex-start' },
  opcion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: Radio.chico },
  texto: { fontSize: 13, lineHeight: 20 },
});
