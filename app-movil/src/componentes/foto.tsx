// ===========================================================================
// La foto de una noticia, con su origen a la vista (R-10)
//
// Una foto de archivo casi nunca es del hecho (la de «incendio forestal» suele
// ser de otro incendio), y una imagen hecha con IA no puede pasar por foto. Por
// eso cada imagen dice de dónde sale: debajo, cuando hay lugar, y como marca
// sobre la miniatura cuando no.
// ===========================================================================

import { Image, type ImageStyle } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp } from 'react-native';

import { PALETA_EDITORIAL, Radio, ROTULO, Tipos, useColores } from '@/constants/tema';
import type { Imagen } from '@/lib/noticias';

const ROTULO_DE_ORIGEN = {
  medio: 'FOTO DEL MEDIO',
  licencia_libre: 'FOTO DE ARCHIVO (NO ES DEL HECHO)',
  generada_ia: 'GENERADA POR IA (NO ES UNA FOTOGRAFÍA)',
} as const;

const MARCA_CHICA = { licencia_libre: 'ARCHIVO', generada_ia: 'IA' } as const;

export function FotoDeNoticia({
  imagen,
  estilo,
  miniatura = false,
}: {
  imagen: Imagen;
  estilo: StyleProp<ImageStyle>;
  /** En la miniatura no hay lugar para el pie: va una marca encima. */
  miniatura?: boolean;
}) {
  const c = useColores();
  const marca = imagen.origen === 'medio' || imagen.origen === null ? null : MARCA_CHICA[imagen.origen];

  return (
    <View>
      <View>
        {/* Sin `transition`: en la web el fundido de expo-image se quedaba con la
            foto en opacidad 0, cargada pero invisible. */}
        <Image source={imagen.url} accessibilityLabel={imagen.alterno} style={estilo} contentFit="cover" />
        {imagen.origen === 'generada_ia' && !miniatura ? (
          <Text style={estilos.sobreIA}>Ilustración generada por IA — no es una fotografía del hecho</Text>
        ) : null}
        {miniatura && marca ? <Text style={estilos.marca}>{marca}</Text> : null}
      </View>
      {miniatura ? null : (
        <Text style={[estilos.pie, { color: c.tintaTenue }]}>
          {imagen.origen ? (
            <Text style={{ color: imagen.origen === 'medio' ? c.tintaSuave : c.alerta, fontFamily: Tipos.textoFuerte }}>
              {ROTULO_DE_ORIGEN[imagen.origen]}
              {'  '}
            </Text>
          ) : null}
          {imagen.credito}
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  pie: { ...ROTULO, fontFamily: Tipos.texto, fontSize: 12, lineHeight: 18, letterSpacing: 0, marginTop: 8 },
  sobreIA: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: `${PALETA_EDITORIAL.negro}F0`,
    color: PALETA_EDITORIAL.blanco,
    fontFamily: Tipos.textoMedio,
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radio.medio,
    overflow: 'hidden',
  },
  marca: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: `${PALETA_EDITORIAL.negro}F0`,
    color: PALETA_EDITORIAL.blanco,
    fontFamily: Tipos.textoFuerte,
    fontSize: 9,
    lineHeight: 14,
    letterSpacing: 0.6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    overflow: 'hidden',
  },
});
