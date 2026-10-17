// ===========================================================================
// El gasto del chatbot, desde la app (R-11)
//
// Solo para administradores. El total es el mismo número que usa el tope para
// cortar el chat; el desglose dice cuánto cuesta cada función. Los números los
// arma el servidor (src/modules/gasto): la app solo los muestra.
// ===========================================================================

import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Mensaje, Seccion, Tarjeta } from '@/componentes/redaccion/ui';
import { Espacio, Tipos, useColores } from '@/constants/tema';
import { leerGasto, type ResumenDeGasto } from '@/lib/redaccion';

const usd = (n: number, decimales = 2) => `USD ${n.toFixed(decimales)}`;

export function Gasto() {
  const c = useColores();
  const [resumen, setResumen] = useState<ResumenDeGasto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    leerGasto().then((r) => {
      if (!vigente) return;
      if ('error' in r) setError(r.error);
      else setResumen(r);
    });
    return () => {
      vigente = false;
    };
  }, []);

  if (error) return <Mensaje resultado={{ error }} />;
  if (resumen === null) return <ActivityIndicator color={c.acento} style={{ marginTop: Espacio.xl }} />;

  const porcentaje = Math.round(resumen.usoDelTope * 100);

  return (
    <View style={{ gap: Espacio.xl }}>
      <Seccion titulo="GASTO DEL CHATBOT">
        <Text style={[estilos.nota, { color: c.tintaSuave }]}>
          Es el mismo número que usa el tope para cortar el chat. Al llegar al tope, el chat deja de llamar al
          modelo y avisa, en vez de fallar cuando se acabe el crédito.
        </Text>
        <Tarjeta>
          <Text style={[estilos.grande, { color: c.tinta }]}>{usd(resumen.gastoUsd, 4)}</Text>
          <Text style={[estilos.nota, { color: c.tintaSuave }]}>
            de un tope de {usd(resumen.topeUsd)} · {porcentaje} % usado
          </Text>
          <View
            style={[estilos.barra, { backgroundColor: c.papelHundido }]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: porcentaje }}>
            <View
              style={[
                estilos.relleno,
                { width: `${Math.max(porcentaje, 1)}%`, backgroundColor: porcentaje >= 90 ? c.peligro : c.acento },
              ]}
            />
          </View>
          <Fila etiqueta="Margen antes del tope" valor={usd(resumen.margenUsd)} />
          {resumen.respuestasRestantes === null ? null : (
            <Fila
              etiqueta="Respuestas que caben"
              valor={`unas ${resumen.respuestasRestantes.toLocaleString('es-GT')}`}
            />
          )}
          {resumen.creditoUsd === null ? null : (
            <Fila etiqueta="Crédito de la cuenta" valor={usd(resumen.creditoUsd)} />
          )}
          <Fila etiqueta="Turnos con costo" valor={resumen.turnos.toLocaleString('es-GT')} />
        </Tarjeta>
      </Seccion>

      <Seccion titulo="CUÁNTO CUESTA CADA FUNCIÓN">
        {resumen.porFuncion.length === 0 ? (
          <Text style={[estilos.nota, { color: c.tintaSuave }]}>Todavía nadie usó el chat.</Text>
        ) : (
          resumen.porFuncion.map((f) => (
            <Tarjeta key={f.funcion}>
              <View style={estilos.cabecera}>
                <Text style={[estilos.nombre, { color: c.tinta }]}>{f.nombre}</Text>
                <Text style={[estilos.numero, { color: c.tinta }]}>{usd(f.promedioUsd, 4)}</Text>
              </View>
              <Text style={[estilos.nota, { color: c.tintaSuave }]}>{f.explicacion}</Text>
              <Text style={[estilos.nota, { color: c.tintaTenue }]}>
                {f.turnos.toLocaleString('es-GT')} turnos · {usd(f.gastoUsd, 4)} en total
                {f.modelos.length > 0 ? ` · ${f.modelos.join(', ')}` : ''}
              </Text>
            </Tarjeta>
          ))
        )}
        <Text style={[estilos.nota, { color: c.tintaTenue }]}>
          No incluye las corridas del red team: sus turnos no se guardan, para no mezclar ataques con tráfico
          real.
        </Text>
      </Seccion>
    </View>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const c = useColores();
  return (
    <View style={estilos.fila}>
      <Text style={[estilos.nota, { color: c.tintaSuave }]}>{etiqueta}</Text>
      <Text style={[estilos.numero, { color: c.tinta }]}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  nota: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 19 },
  grande: { fontFamily: Tipos.numeros, fontSize: 30 },
  numero: { fontFamily: Tipos.numeros, fontSize: 14 },
  nombre: { fontFamily: Tipos.textoFuerte, fontSize: 15, flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: Espacio.m },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: Espacio.m },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: Espacio.s },
  relleno: { height: 8, borderRadius: 4 },
});
