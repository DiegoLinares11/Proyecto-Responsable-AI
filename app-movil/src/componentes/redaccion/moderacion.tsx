// ===========================================================================
// Moderar, desde la app
//
// La cola de lo que el canal dejó en revisión, y las alertas de noticias ya
// publicadas cuyo texto intentó manipular al chatbot. Cada decisión pide un
// motivo, que queda en la auditoría. El sistema delata; decide una persona.
// ===========================================================================

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Boton, Entrada, Mensaje, Seccion, Tarjeta } from '@/componentes/redaccion/ui';
import { Sello } from '@/componentes/sello';
import { Espacio, Tipos, useColores } from '@/constants/tema';
import { decidir, leerModeracion, type AlertaDeContenido, type NoticiaEnRevision } from '@/lib/redaccion';

type Datos = { cola: NoticiaEnRevision[]; alertas: AlertaDeContenido[] };

const ESTADO = { en_revision: 'En revisión', no_verificable: 'No verificable' } as Record<string, string>;

export function Moderacion() {
  const c = useColores();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await leerModeracion();
    if ('error' in r) setError(r.error);
    else {
      setError(null);
      setDatos(r);
    }
  }, []);

  // La primera carga: el estado se toca solo cuando llega la respuesta.
  useEffect(() => {
    let vigente = true;
    leerModeracion().then((r) => {
      if (!vigente) return;
      if ('error' in r) setError(r.error);
      else setDatos(r);
    });
    return () => {
      vigente = false;
    };
  }, []);

  if (error) return <Mensaje resultado={{ error }} />;
  if (datos === null) return <ActivityIndicator color={c.acento} style={{ marginTop: Espacio.xl }} />;

  return (
    <View style={{ gap: Espacio.xl }}>
      <Seccion titulo={`ALERTAS DE CONTENIDO · ${datos.alertas.length}`}>
        <Text style={[estilos.nota, { color: c.tintaSuave }]}>
          Noticias ya publicadas cuyo texto intentó manipular al chatbot. Siguen publicadas: una alerta no
          despublica nada sola. La decisión es tuya.
        </Text>
        {datos.alertas.length === 0 ? (
          <Text style={[estilos.vacio, { color: c.tintaSuave }]}>Ninguna noticia publicada intentó manipular al chatbot.</Text>
        ) : (
          datos.alertas.map((a) => <FilaDeAlerta key={a.idNoticia} alerta={a} alCambiar={cargar} />)
        )}
      </Seccion>

      <Seccion titulo={`EN REVISIÓN · ${datos.cola.length}`}>
        <Text style={[estilos.nota, { color: c.tintaSuave }]}>
          Lo que el canal de validación no dio por bueno. Aprobar la publica; rechazar la marca como no
          verificable; archivar la saca de la cola.
        </Text>
        {datos.cola.length === 0 ? (
          <Text style={[estilos.vacio, { color: c.tintaSuave }]}>No hay noticias esperando.</Text>
        ) : (
          datos.cola.map((n) => <FilaDeRevision key={n.id} noticia={n} alCambiar={cargar} />)
        )}
      </Seccion>
    </View>
  );
}

function FilaDeRevision({ noticia, alCambiar }: { noticia: NoticiaEnRevision; alCambiar: () => void }) {
  const c = useColores();
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ error: string } | { ok: string } | null>(null);

  async function tomar(decision: 'aprobar' | 'rechazar' | 'archivar') {
    setOcupado(decision);
    const r = await decidir('noticia', noticia.id, decision, motivo);
    setOcupado(null);
    setResultado(r);
    if ('ok' in r) alCambiar();
  }

  return (
    <Tarjeta>
      <View style={estilos.cabecera}>
        <Sello puntaje={noticia.puntajeVeracidad} />
        <Text style={[estilos.estado, { color: c.tintaSuave }]}>{ESTADO[noticia.estado] ?? noticia.estado}</Text>
      </View>
      <Text style={[estilos.titulo, { color: c.tinta }]}>{noticia.titulo}</Text>
      <Text style={[estilos.resumen, { color: c.tintaSuave }]} numberOfLines={3}>
        {noticia.resumen}
      </Text>
      {noticia.rafagaSospechosa ? (
        <Text style={[estilos.aviso, { color: c.alerta }]}>Tracción sospechosa: {noticia.rafagaMotivo ?? 'ráfaga de cuentas nuevas'}</Text>
      ) : null}
      <Entrada etiqueta="Motivo" pista="queda en la auditoría" value={motivo} onChangeText={setMotivo} />
      <View style={estilos.botones}>
        <Boton texto="Aprobar y publicar" alPresionar={() => tomar('aprobar')} ocupado={ocupado === 'aprobar'} />
        <Boton texto="Rechazar" secundario peligro alPresionar={() => tomar('rechazar')} ocupado={ocupado === 'rechazar'} />
        <Boton texto="Archivar" secundario alPresionar={() => tomar('archivar')} ocupado={ocupado === 'archivar'} />
      </View>
      <Mensaje resultado={resultado} />
    </Tarjeta>
  );
}

function FilaDeAlerta({ alerta, alCambiar }: { alerta: AlertaDeContenido; alCambiar: () => void }) {
  const c = useColores();
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ error: string } | { ok: string } | null>(null);

  async function tomar(decision: 'descartar' | 'archivar' | 'rechazar') {
    setOcupado(decision);
    const r = await decidir('alerta', alerta.idNoticia, decision, motivo);
    setOcupado(null);
    setResultado(r);
    if ('ok' in r) alCambiar();
  }

  return (
    <Tarjeta>
      <Text style={[estilos.titulo, { color: c.tinta }]}>{alerta.titulo}</Text>
      <Text style={[estilos.resumen, { color: c.tintaSuave }]}>
        {alerta.fuente ?? 'fuente no registrada'} · publicó {alerta.autor ?? 'desconocido'} · {alerta.veces}{' '}
        {alerta.veces === 1 ? 'detección' : 'detecciones'}
      </Text>
      {alerta.evidencias.slice(0, 2).map((ev, i) => (
        <Text key={i} style={[estilos.evidencia, { color: c.alertaTexto, backgroundColor: c.alertaFondo }]}>
          {ev.comprobacion}: «{ev.evidencia}»
        </Text>
      ))}
      <Entrada etiqueta="Motivo" pista="queda en la auditoría" value={motivo} onChangeText={setMotivo} />
      <View style={estilos.botones}>
        <Boton texto="Descartar: no era una orden" secundario alPresionar={() => tomar('descartar')} ocupado={ocupado === 'descartar'} />
        <Boton texto="Sacar de publicación" secundario peligro alPresionar={() => tomar('archivar')} ocupado={ocupado === 'archivar'} />
      </View>
      <Mensaje resultado={resultado} />
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  nota: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 19 },
  vacio: { fontFamily: Tipos.texto, fontSize: 14, paddingVertical: Espacio.m },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: Espacio.s },
  estado: { fontFamily: Tipos.textoMedio, fontSize: 12 },
  titulo: { fontFamily: Tipos.titular, fontSize: 18, lineHeight: 22 },
  resumen: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 19 },
  aviso: { fontFamily: Tipos.textoMedio, fontSize: 13 },
  evidencia: { fontFamily: Tipos.numeros, fontSize: 12, lineHeight: 17, padding: 8, borderRadius: 3, overflow: 'hidden' },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
