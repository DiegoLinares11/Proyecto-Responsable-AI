// ===========================================================================
// Publicar, desde la app
//
// El mismo formulario del portal, con las mismas reglas: las aplica el backend
// (src/modules/redaccion). La noticia no se publica al enviarla: va al canal de
// validación, que la publica, la deja en revisión o la rechaza, y la respuesta
// dice cuál y con qué puntaje.
// ===========================================================================

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IlustracionTipografica } from '@/componentes/ilustracion';
import { Boton, Entrada, Mensaje, Opciones, Seccion, Tarjeta } from '@/componentes/redaccion/ui';
import { Espacio, Radio, Tipos, useColores } from '@/constants/tema';
import { usePreferencias } from '@/lib/preferencias';
import { buscarFotos, publicar, type FotoLibre } from '@/lib/redaccion';
import { nombreDeSeccion, SECCIONES, type SeccionDeNoticia } from '@/lib/secciones';

type Alcance = 'local' | 'nacional' | 'internacional';
type Origen = 'ilustracion' | 'licencia_libre' | 'medio';

const ALCANCES = [
  { valor: 'local', nombre: 'Local: de una zona' },
  { valor: 'nacional', nombre: 'Nacional: de un país' },
  { valor: 'internacional', nombre: 'Internacional' },
] as const;

const ORIGENES = [
  { valor: 'ilustracion', nombre: 'Ilustración tipográfica' },
  { valor: 'licencia_libre', nombre: 'Foto de archivo libre' },
  { valor: 'medio', nombre: 'Foto del medio' },
] as const;

export function Publicar() {
  const c = useColores();
  const { ubicaciones } = usePreferencias();

  const [titulo, setTitulo] = useState('');
  const [seccion, setSeccion] = useState<SeccionDeNoticia>('general');
  const [alcance, setAlcance] = useState<Alcance>('nacional');
  const [zona, setZona] = useState('');
  const [pais, setPais] = useState('GT');
  const [resumen, setResumen] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [url, setUrl] = useState('');

  const [origen, setOrigen] = useState<Origen>('ilustracion');
  const [consulta, setConsulta] = useState('');
  const [fotos, setFotos] = useState<FotoLibre[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorDeBusqueda, setErrorDeBusqueda] = useState<string | null>(null);
  const [elegida, setElegida] = useState<FotoLibre | null>(null);
  const [alterno, setAlterno] = useState('');
  const [urlImagen, setUrlImagen] = useState('');
  const [credito, setCredito] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ error: string } | { ok: string; idNoticia?: string; estado?: string } | null>(null);

  const departamentos = ubicaciones.filter((u) => u.tipo === 'departamento').map((u) => ({ valor: u.id, nombre: u.nombre }));
  const paises = [
    { valor: 'GT', nombre: 'Guatemala' },
    ...ubicaciones.filter((u) => u.tipo === 'pais').map((u) => ({ valor: u.pais, nombre: u.nombre })),
  ];

  async function buscar() {
    setErrorDeBusqueda(null);
    setBuscando(true);
    const r = await buscarFotos(consulta);
    setBuscando(false);
    if ('error' in r) {
      setErrorDeBusqueda(r.error);
      setFotos(null);
    } else {
      setFotos(r.fotos);
    }
  }

  function elegir(foto: FotoLibre) {
    setElegida(foto);
    setAlterno(foto.alterno);
  }

  async function enviar() {
    setResultado(null);
    setEnviando(true);
    const r = await publicar({
      titulo,
      seccion,
      alcance,
      zona: alcance === 'local' ? zona : '',
      pais: alcance === 'nacional' ? pais : '',
      resumen,
      cuerpo,
      url,
      origen_imagen: origen,
      url_fuente_imagen: origen === 'licencia_libre' ? (elegida?.urlFuente ?? '') : '',
      url_imagen: origen === 'medio' ? urlImagen : '',
      credito_imagen: origen === 'medio' ? credito : '',
      texto_alterno_imagen: origen === 'licencia_libre' ? alterno : origen === 'medio' ? alterno : '',
    });
    setEnviando(false);

    if ('error' in r) {
      setResultado(r);
      return;
    }
    setResultado({ ok: `${r.ok} Puntaje de veracidad: ${r.puntaje}/100.`, idNoticia: r.idNoticia, estado: r.estado });
    // Lo enviado ya no es un borrador en esta pantalla: se empieza de nuevo.
    setTitulo('');
    setResumen('');
    setCuerpo('');
    setUrl('');
    setElegida(null);
    setFotos(null);
    setConsulta('');
    setAlterno('');
    setUrlImagen('');
    setCredito('');
  }

  return (
    <View style={{ gap: Espacio.xl }}>
      <Seccion titulo="LA NOTICIA">
        <Entrada etiqueta="Titular" value={titulo} onChangeText={setTitulo} maxLength={300} placeholder="Lo que pasó, en una línea" />
        <Opciones
          etiqueta="Sección"
          opciones={SECCIONES.map((s) => ({ valor: s.clave, nombre: s.nombre }))}
          valor={seccion}
          cambiar={setSeccion}
        />
        <Entrada etiqueta="Resumen" value={resumen} onChangeText={setResumen} multiline maxLength={1000} />
        <Entrada etiqueta="Cuerpo" value={cuerpo} onChangeText={setCuerpo} multiline />
        <Entrada
          etiqueta="Enlace al artículo original"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://..."
        />
        <Text style={[estilos.nota, { color: c.tintaSuave }]}>
          Sin enlace, la noticia no puede llegar a verificada: la credibilidad de la fuente y la
          comprobación de la URL son 50 de los 100 puntos, y el umbral es 75.
        </Text>
      </Seccion>

      <Seccion titulo="¿A QUIÉN LE IMPORTA?">
        <Opciones opciones={ALCANCES} valor={alcance} cambiar={setAlcance} />
        {alcance === 'local' ? <Opciones etiqueta="Zona" opciones={departamentos} valor={zona} cambiar={setZona} /> : null}
        {alcance === 'nacional' ? <Opciones etiqueta="País" opciones={paises} valor={pais} cambiar={setPais} /> : null}
        <Text style={[estilos.nota, { color: c.tintaSuave }]}>
          Decide dónde aparece en la app: una noticia local va arriba para quien eligió esa zona, y nunca
          desaparece para los demás. Lo declara quien publica; ningún modelo lo adivina.
        </Text>
      </Seccion>

      <Seccion titulo="IMAGEN DE PORTADA">
        <Opciones opciones={ORIGENES} valor={origen} cambiar={setOrigen} />

        {origen === 'ilustracion' ? (
          <View style={{ gap: 6 }}>
            <IlustracionTipografica seccion={nombreDeSeccion(seccion)} titulo={titulo || 'El titular de la noticia'} />
            <Text style={[estilos.nota, { color: c.tintaSuave }]}>
              Sin foto: la sección y el titular, compuestos. Sin IA y sin costo, y no se confunde con una foto.
            </Text>
          </View>
        ) : null}

        {origen === 'licencia_libre' ? (
          <View style={{ gap: Espacio.m }}>
            <Entrada
              etiqueta="Buscar en Wikimedia Commons"
              value={consulta}
              onChangeText={setConsulta}
              onSubmitEditing={buscar}
              placeholder="incendio forestal, estadio…"
              returnKeyType="search"
            />
            <Boton texto="Buscar" alPresionar={buscar} ocupado={buscando} desactivado={consulta.trim().length < 3} secundario />
            {errorDeBusqueda ? <Mensaje resultado={{ error: errorDeBusqueda }} /> : null}
            {fotos !== null && fotos.length === 0 ? (
              <Text style={[estilos.nota, { color: c.tintaSuave }]}>Nada con licencia libre. Probá con otras palabras.</Text>
            ) : null}
            {fotos !== null && fotos.length > 0 ? (
              <View style={estilos.fotos}>
                {fotos.map((f) => {
                  const esta = elegida?.urlFuente === f.urlFuente;
                  return (
                    <Pressable
                      key={f.urlFuente}
                      onPress={() => elegir(f)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: esta }}
                      accessibilityLabel={`${f.alterno}. ${f.credito}`}
                      style={[estilos.foto, { borderColor: esta ? c.acento : c.borde, borderWidth: esta ? 2 : 1 }]}>
                      <Image source={f.url} style={estilos.fotoImagen} contentFit="cover" />
                      <Text style={[estilos.fotoTexto, { color: c.tinta }]} numberOfLines={1}>
                        {f.autor}
                      </Text>
                      <Text style={[estilos.fotoTexto, { color: c.tintaTenue }]}>{f.licencia}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {elegida ? (
              <Tarjeta>
                <Text style={[estilos.nota, { color: c.tinta }]}>Crédito: {elegida.credito}</Text>
                <Entrada etiqueta="Texto alternativo" pista="qué se ve en la foto" value={alterno} onChangeText={setAlterno} />
                <Text style={[estilos.nota, { color: c.tintaSuave }]}>
                  En la portada va a decir «Foto de archivo (no es del hecho)». Al guardar se vuelve a consultar
                  Commons: el autor y la licencia salen de ahí.
                </Text>
              </Tarjeta>
            ) : null}
          </View>
        ) : null}

        {origen === 'medio' ? (
          <View style={{ gap: Espacio.m }}>
            <Entrada
              etiqueta="Enlace a la imagen"
              pista="solo https"
              value={urlImagen}
              onChangeText={setUrlImagen}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Entrada etiqueta="Crédito" value={credito} onChangeText={setCredito} placeholder="Fotografía: nombre / medio" />
            <Entrada etiqueta="Texto alternativo" pista="qué se ve en la foto" value={alterno} onChangeText={setAlterno} />
          </View>
        ) : null}
      </Seccion>

      <View style={{ gap: Espacio.m }}>
        <Boton texto={enviando ? 'Validando…' : 'Enviar a validación'} alPresionar={enviar} ocupado={enviando} />
        {enviando ? (
          <Text style={[estilos.nota, { color: c.tintaSuave }]}>El canal revisa cinco señales: puede tardar medio minuto.</Text>
        ) : null}
        <Mensaje resultado={resultado} />
        {resultado && 'ok' in resultado && resultado.estado === 'verificada' && resultado.idNoticia ? (
          <Boton
            texto="Ver la noticia publicada"
            secundario
            alPresionar={() => router.push({ pathname: '/noticia/[id]', params: { id: resultado.idNoticia! } })}
          />
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  nota: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 19 },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  foto: { width: 150, borderRadius: Radio.medio, padding: 4, gap: 2 },
  fotoImagen: { width: '100%', aspectRatio: 4 / 3, borderRadius: 3 },
  fotoTexto: { fontFamily: Tipos.texto, fontSize: 11 },
});
