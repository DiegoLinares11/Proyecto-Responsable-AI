// ===========================================================================
// Las cuentas y sus permisos, desde la app
//
// Toda cuenta entra como lector. Acá un administrador la hace publicadora o
// moderadora, con un motivo que queda en la auditoría. Nadie cambia su propio
// rol, y un administrador se nombra en el servidor, no desde acá: las reglas
// las aplica el backend (src/modules/usuarios/roles.ts).
// ===========================================================================

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Boton, Entrada, Mensaje, Opciones, Seccion, Tarjeta } from '@/componentes/redaccion/ui';
import { Espacio, Tipos, useColores } from '@/constants/tema';
import { cambiarRol, leerCuentas, type CambioDeRol, type Cuenta } from '@/lib/redaccion';

const NOMBRE: Record<string, string> = {
  lector: 'Lector',
  publicador: 'Publicador',
  moderador: 'Moderador',
  administrador: 'Administrador',
};

const ROLES_DEL_PANEL = [
  { valor: 'lector', nombre: 'Lector' },
  { valor: 'publicador', nombre: 'Publicador' },
  { valor: 'moderador', nombre: 'Moderador' },
] as const;

type Datos = { cuentas: Cuenta[]; cambios: CambioDeRol[]; yo: string };

export function Cuentas() {
  const c = useColores();
  const [conDemostracion, setConDemostracion] = useState(false);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (demo: boolean) => {
    const r = await leerCuentas(demo);
    if ('error' in r) setError(r.error);
    else {
      setError(null);
      setDatos(r);
    }
  }, []);

  useEffect(() => {
    let vigente = true;
    leerCuentas(conDemostracion).then((r) => {
      if (!vigente) return;
      if ('error' in r) setError(r.error);
      else setDatos(r);
    });
    return () => {
      vigente = false;
    };
  }, [conDemostracion]);

  if (error) return <Mensaje resultado={{ error }} />;
  if (datos === null) return <ActivityIndicator color={c.acento} style={{ marginTop: Espacio.xl }} />;

  return (
    <View style={{ gap: Espacio.xl }}>
      <Seccion titulo={`CUENTAS (${datos.cuentas.length})`}>
        <Text style={[estilos.nota, { color: c.tintaSuave }]}>
          Toda cuenta nueva entra como lector. Publicador: manda noticias al canal de validación. Moderador:
          además decide las que quedan en revisión. Cada cambio pide un motivo y queda en la auditoría.
        </Text>
        <Pressable onPress={() => setConDemostracion((v) => !v)} accessibilityRole="button" style={estilos.enlace}>
          <Text style={[estilos.enlaceTexto, { color: c.acento }]}>
            {conDemostracion ? 'Ocultar las cuentas de demostración' : 'Mostrar también las cuentas de demostración'}
          </Text>
        </Pressable>
        {datos.cuentas.map((cuenta) => (
          <FilaDeCuenta
            key={cuenta.id}
            cuenta={cuenta}
            esMia={cuenta.id === datos.yo}
            alCambiar={() => cargar(conDemostracion)}
          />
        ))}
      </Seccion>

      <Seccion titulo="ÚLTIMOS CAMBIOS DE ROL">
        {datos.cambios.length === 0 ? (
          <Text style={[estilos.nota, { color: c.tintaSuave }]}>Todavía no hay cambios registrados.</Text>
        ) : (
          datos.cambios.map((cambio, i) => (
            <View key={i} style={[estilos.cambio, { borderBottomColor: c.borde }]}>
              <Text style={[estilos.cambioTexto, { color: c.tinta }]}>
                <Text style={{ fontFamily: Tipos.textoMedio }}>{cambio.correo}</Text>: {NOMBRE[cambio.de] ?? cambio.de} →{' '}
                {NOMBRE[cambio.a] ?? cambio.a}
              </Text>
              <Text style={[estilos.nota, { color: c.tintaSuave }]}>
                {new Date(cambio.cuando).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })}{'\n'}«
                {cambio.motivo}»
              </Text>
            </View>
          ))
        )}
      </Seccion>
    </View>
  );
}

function FilaDeCuenta({ cuenta, esMia, alCambiar }: { cuenta: Cuenta; esMia: boolean; alCambiar: () => void }) {
  const c = useColores();
  const [rol, setRol] = useState(cuenta.rol === 'administrador' ? 'lector' : cuenta.rol);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState<{ error: string } | { ok: string } | null>(null);

  async function guardar() {
    setOcupado(true);
    const r = await cambiarRol(cuenta.id, rol, motivo);
    setOcupado(false);
    setResultado(r);
    if ('ok' in r) {
      setMotivo('');
      alCambiar();
    }
  }

  return (
    <Tarjeta>
      <View style={estilos.fila}>
        <View style={{ flex: 1 }}>
          <Text style={[estilos.nombre, { color: c.tinta }]}>{cuenta.nombre}</Text>
          <Text style={[estilos.nota, { color: c.tintaSuave }]}>{cuenta.correo}</Text>
        </View>
        <Text style={[estilos.rol, { color: cuenta.rol === 'lector' ? c.tintaSuave : c.acento }]}>
          {(NOMBRE[cuenta.rol] ?? cuenta.rol).toUpperCase()}
        </Text>
      </View>
      {esMia ? (
        <Text style={[estilos.nota, { color: c.tintaTenue }]}>Es tu cuenta: nadie cambia su propio rol.</Text>
      ) : cuenta.rol === 'administrador' ? (
        <Text style={[estilos.nota, { color: c.tintaTenue }]}>Un administrador se cambia en el servidor.</Text>
      ) : (
        <View style={{ gap: Espacio.s }}>
          <Opciones opciones={ROLES_DEL_PANEL} valor={rol} cambiar={setRol} />
          <Entrada etiqueta="Motivo" pista="queda en la auditoría" value={motivo} onChangeText={setMotivo} />
          <Boton texto="Cambiar rol" alPresionar={guardar} ocupado={ocupado} desactivado={rol === cuenta.rol} />
          <Mensaje resultado={resultado} />
        </View>
      )}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  nota: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 23 },
  enlace: { minHeight: 44, justifyContent: 'center' },
  enlaceTexto: { fontFamily: Tipos.textoMedio, fontSize: 14, lineHeight: 23 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Espacio.m },
  nombre: { fontFamily: Tipos.textoFuerte, fontSize: 16, lineHeight: 25 },
  rol: { fontFamily: Tipos.textoFuerte, fontSize: 11, lineHeight: 19, letterSpacing: 1.2 },
  cambio: { paddingVertical: Espacio.l, borderBottomWidth: 1, gap: 6 },
  cambioTexto: { fontFamily: Tipos.texto, fontSize: 14, lineHeight: 24 },
});
