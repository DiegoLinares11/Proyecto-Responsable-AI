import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Espacio, ROTULO, Tipos, useColores } from '@/constants/tema';
import { CABECERAS } from '@/lib/cercania';
import type { UbicacionDisponible } from '@/lib/preferencias';
import { DatoEditorial } from './dato-editorial';

// Contorno simplificado de Natural Earth (dominio público), distribuido por
// github.com/johan/world.geo.json/blob/master/countries/GTM.geo.json.
// Sin fronteras departamentales inventadas; el punto marca la cabecera aproximada.
const CONTORNO = [
  [-90.095555,13.735338],[-90.608624,13.909771],[-91.23241,13.927832],[-91.689747,14.126218],[-92.22775,14.538829],[-92.20323,14.830103],[-92.087216,15.064585],[-92.229249,15.251447],[-91.74796,16.066565],[-90.464473,16.069562],[-90.438867,16.41011],[-90.600847,16.470778],[-90.711822,16.687483],[-91.08167,16.918477],[-91.453921,17.252177],[-91.002269,17.254658],[-91.00152,17.817595],[-90.067934,17.819326],[-89.14308,17.808319],[-89.150806,17.015577],[-89.229122,15.886938],[-88.930613,15.887273],[-88.604586,15.70638],[-88.518364,15.855389],[-88.225023,15.727722],[-88.68068,15.346247],[-89.154811,15.066419],[-89.22522,14.874286],[-89.145535,14.678019],[-89.353326,14.424133],[-89.587343,14.362586],[-89.534219,14.244816],[-89.721934,14.134228],[-90.064678,13.88197],
] as const;
const x = (lon: number) => 12 + (lon + 92.4) * 48;
const y = (lat: number) => 12 + (17.95 - lat) * 48;
const BORDE = CONTORNO.map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'}${x(lon).toFixed(1)} ${y(lat).toFixed(1)}`).join(' ') + 'Z';

export function AtlasDeUbicacion({ ubicacion }: { ubicacion: UbicacionDisponible }) {
  const c = useColores();
  const cabecera = CABECERAS.find(p => p.id === ubicacion.id);
  return (
    <View style={[estilos.atlas, { backgroundColor: c.papelHundido, borderColor: c.borde }]}>
      <View aria-hidden>
        <Svg width={128} height={140} viewBox="0 0 220 220">
          {ubicacion.tipo === 'departamento' ? <>
            <Path d={BORDE} fill={c.papel} stroke={c.tintaSuave} strokeWidth={1.5} strokeLinejoin="round" />
            {cabecera ? <><Circle cx={x(cabecera.lon)} cy={y(cabecera.lat)} r={11} fill="none" stroke={c.acento} strokeWidth={1.5} /><Circle cx={x(cabecera.lon)} cy={y(cabecera.lat)} r={4} fill={c.acento} /></> : null}
          </> : <>
            <Circle cx={110} cy={110} r={82} fill="none" stroke={c.tintaSuave} strokeWidth={1.5} />
            <Path d="M28 110h164 M110 28c-60 40-60 124 0 164 M110 28c60 40 60 124 0 164 M40 68h140 M40 152h140" fill="none" stroke={c.tintaSuave} strokeWidth={1.5} />
          </>}
        </Svg>
      </View>
      <View style={estilos.detalle}>
        <Text style={[ROTULO, { color: c.tintaSuave }]}>{ubicacion.tipo === 'departamento' ? 'GUATEMALA' : 'OTRAS PERSPECTIVAS'}</Text>
        <Text style={[estilos.nombre, { color: c.tinta }]}>{ubicacion.nombre}</Text>
        <DatoEditorial tipo="zona" texto="Ubicación elegida" />
        <Text style={[estilos.nota, { color: c.tintaTenue }]}>{cabecera ? 'Mapa orientativo. El punto señala la cabecera aproximada.' : 'Tu selección cambia la portada y el contexto del asistente.'}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  atlas: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Espacio.l, padding: Espacio.l, margin: Espacio.l, borderWidth: 1 },
  detalle: { flex: 1, minWidth: 120, gap: Espacio.s },
  nombre: { fontFamily: Tipos.lectura, fontSize: 29, lineHeight: 34 },
  nota: { fontFamily: Tipos.texto, fontSize: 11, lineHeight: 17 },
});
