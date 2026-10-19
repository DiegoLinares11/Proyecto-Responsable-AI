import { StyleSheet, Text, View } from 'react-native';

import { Espacio, ROTULO, Tipos, useColores } from '@/constants/tema';
import type { NoticiaCompleta, Senal } from '@/lib/noticias';
import { DetalleEditorial } from './detalle-editorial';
import { Comprobado, Contexto } from './iconos';

const NOMBRES: Record<string, string> = {
  credibilidad_fuente: 'Fuente', url_verificable: 'Enlace verificable',
  corroboracion: 'Corroboración', coherencia: 'Coherencia', desmentido: 'Desmentidos',
};
const ORDEN = Object.keys(NOMBRES);
const numero = (x: number) => Number.isInteger(x) ? String(x) : x.toFixed(1);

export function FichaDeVerificacion({ noticia, abierto, alCambiar }: {
  noticia: NoticiaCompleta; abierto: boolean; alCambiar: (valor: boolean) => void;
}) {
  const c = useColores();
  const senales = [...noticia.senales].sort((a, b) => ORDEN.indexOf(a.senal) - ORDEN.indexOf(b.senal));
  const veto = senales.some(s => s.detalle['veto'] === true);
  const incompletas = senales.filter(s => !s.disponible || String(s.detalle['resultado'] ?? '').includes('no_configurado')).length;
  const verificada = noticia.puntajeVeracidad !== null && noticia.puntajeVeracidad >= 75 && !veto;
  const color = veto ? c.peligro : verificada ? c.verificado : c.alerta;
  const Icono = verificada ? Comprobado : Contexto;
  const estado = veto ? 'Con desmentido registrado' : noticia.puntajeVeracidad === null ? 'Sin evaluación registrada' : verificada ? 'Umbral de verificación alcanzado' : 'Verificación incompleta';
  return (
    <View style={[estilos.ficha, { borderColor: c.borde, borderTopColor: c.asistente, backgroundColor: c.papelHundido }]}>
      <View style={[estilos.registro, { borderColor: c.bordeFuerte }]}>
        <Text style={[ROTULO, { color: c.tintaSuave }]}>Registro de evidencia</Text>
        <Text style={[estilos.folio, { color: c.tintaTenue }]}>REF / {noticia.id.slice(0, 8).toUpperCase()}</Text>
      </View>
      <Text style={[estilos.titulo, { color: c.tinta }]} accessibilityRole="header">Ficha de verificación</Text>
      <View style={estilos.estado}>
        <Icono color={color} tamano={20} />
        <Text style={[estilos.estadoTexto, { color }]}>{estado}</Text>
      </View>
      <Text style={[estilos.texto, { color: c.tintaSuave }]}>
        {senales.length === 0 ? 'No hay comprobaciones guardadas para esta noticia. El puntaje disponible no permite revisar cómo se obtuvo.' : incompletas > 0 ? `${incompletas === 1 ? 'Una comprobación no pudo completarse' : `${incompletas} comprobaciones no pudieron completarse`}. Podés consultar qué evidencia está disponible y qué falta.` : 'Consultá la fuente, el enlace y las demás señales utilizadas para evaluar esta noticia.'}
      </Text>
      <DetalleEditorial titulo="Ver las comprobaciones" abierto={abierto} alCambiar={alCambiar}>
        {senales.length === 0 ? <Text style={[estilos.texto, { color: c.alerta }]}>Sin desglose disponible. Esto puede ocurrir en noticias de demostración.</Text> : senales.map((senal, i) => <Fila key={senal.senal} senal={senal} indice={i} />)}
        <View style={[estilos.puntaje, { borderColor: c.bordeFuerte }]}>
          <Text style={[estilos.texto, { color: c.tinta }]}>Puntaje de las comprobaciones</Text>
          <Text style={[estilos.numero, { color }]}>{noticia.puntajeVeracidad ?? '—'}<Text style={[estilos.texto, { color: c.tintaSuave }]}> / 100</Text></Text>
        </View>
        <Text style={[estilos.texto, { color: c.tintaSuave }]}>No es un porcentaje de certeza. La validación automática requiere al menos 75 puntos y ningún veto por desmentidos.</Text>
      </DetalleEditorial>
    </View>
  );
}

function Fila({ senal, indice }: { senal: Senal; indice: number }) {
  const c = useColores();
  const veto = senal.detalle['veto'] === true;
  const incompleta = !senal.disponible || String(senal.detalle['resultado'] ?? '').includes('no_configurado');
  const color = veto ? c.peligro : incompleta ? c.alerta : c.tinta;
  const estado = veto ? 'Desmentida' : incompleta ? 'Sin comprobar' : senal.senal === 'desmentido' ? 'Sin desmentidos detectados' : `${numero(senal.aporte)} / ${Number(senal.detalle['maximo'] ?? 0)}`;
  return (
    <View style={[estilos.fila, { borderColor: c.borde, backgroundColor: incompleta ? c.alertaFondo : 'transparent' }]}>
      <Text style={[estilos.indice, { color: c.tintaTenue }]} aria-hidden>{String(indice + 1).padStart(2, '0')}</Text>
      <View style={estilos.detalle}>
        <View style={estilos.cabeceraFila}>
          <Text style={[estilos.nombre, { color }]}>{NOMBRES[senal.senal] ?? senal.senal}</Text>
          <Text style={[estilos.valor, { color }]}>{estado}</Text>
        </View>
        <Text style={[estilos.texto, { color: incompleta ? c.alertaTexto : c.tintaSuave }]}>{String(senal.detalle['explicacion'] ?? 'Sin explicación registrada.').replace(/_/g, ' ')}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  ficha: { padding: Espacio.xl, gap: Espacio.l, borderWidth: 1, borderTopWidth: 3, borderRadius: 4 },
  registro: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Espacio.m, paddingBottom: Espacio.l, borderBottomWidth: 1 },
  folio: { fontFamily: Tipos.numeros, fontSize: 10, lineHeight: 17 },
  titulo: { fontFamily: Tipos.titular, fontSize: 30, lineHeight: 37 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: Espacio.m },
  estadoTexto: { fontFamily: Tipos.textoMedio, fontSize: 14, lineHeight: 23, flex: 1 },
  texto: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 23 },
  fila: { flexDirection: 'row', gap: Espacio.m, borderBottomWidth: 1, paddingVertical: Espacio.l, paddingHorizontal: Espacio.s, borderRadius: 4 },
  indice: { fontFamily: Tipos.numeros, fontSize: 12, lineHeight: 21, paddingTop: 2 },
  detalle: { flex: 1, minWidth: 0, gap: Espacio.s },
  cabeceraFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: Espacio.s },
  nombre: { fontFamily: Tipos.textoMedio, fontSize: 14, lineHeight: 23 },
  valor: { fontFamily: Tipos.numeros, fontSize: 12, lineHeight: 20, flexShrink: 1 },
  puntaje: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: Espacio.l, paddingTop: Espacio.l, borderTopWidth: 1 },
  numero: { fontFamily: Tipos.numeros, fontSize: 30, lineHeight: 38 },
});
