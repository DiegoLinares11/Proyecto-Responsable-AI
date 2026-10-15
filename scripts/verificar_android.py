"""Recorridos de UI nativa en un emulador dedicado, con backend local simulado."""
import json
import os
import re
import shlex
import subprocess
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ADB = os.environ.get('ADB', 'adb')
SERIAL = os.environ.get('ANDROID_SERIAL', 'emulator-5554')
PUERTO = os.environ.get('METRO_PORT', '8095')
SALIDA = Path(os.environ.get('ANDROID_EVIDENCE_DIR', '/tmp/noticias-android'))
CASOS = [
    ('amplio-claro-gestos', '1080x2400', '420', '1.0', 'hole', 'gestural', 'claro'),
    ('amplio-oscuro-gestos', '1080x2400', '420', '1.0', 'hole', 'gestural', 'oscuro'),
    ('compacto-claro-botones', '720x1600', '320', '1.3', 'tall', 'threebutton', 'claro'),
    ('compacto-oscuro-botones', '720x1600', '320', '1.3', 'tall', 'threebutton', 'oscuro'),
]
if os.environ.get('ANDROID_TEST_CASE'):
    CASOS = [c for c in CASOS if c[0] == os.environ['ANDROID_TEST_CASE']]
assert CASOS, 'El escenario debe existir.'
assert SERIAL.startswith('emulator-'), 'Usar un emulador dedicado, no un teléfono personal.'


def adb(*args):
    return subprocess.check_output([ADB, '-s', SERIAL, *args], timeout=45)


assert adb('shell', 'getprop', 'ro.kernel.qemu').strip() == b'1', 'Se requiere emulador.'
SALIDA.mkdir(parents=True, exist_ok=True)


def arbol():
    adb('shell', 'uiautomator', 'dump', '/sdcard/noticias-ui.xml')
    return ET.fromstring(adb('exec-out', 'cat', '/sdcard/noticias-ui.xml'))


def caja(n):
    return tuple(map(int, re.findall(r'\d+', n.get('bounds', ''))))


def buscar(texto, raiz=None):
    raiz = raiz if raiz is not None else arbol()
    nodos = [n for n in raiz.iter('node') if texto in (n.get('text'), n.get('content-desc'))]
    interactivos = [n for n in nodos if n.get('clickable') == 'true']
    parciales = [n for n in raiz.iter('node') if texto in n.get('text', '') or texto in n.get('content-desc', '')]
    nodos = interactivos or [n for n in parciales if n.get('clickable') == 'true'] or nodos or parciales
    if not nodos:
        return None
    return min(nodos, key=lambda n: (n.get('clickable') != 'true', (caja(n)[2]-caja(n)[0])*(caja(n)[3]-caja(n)[1])))


def esperar(texto):
    for _ in range(12):
        n = buscar(texto)
        if n is not None:
            return n
        time.sleep(0.3)
    raise AssertionError('No se encontró: ' + texto)


def tocar(texto):
    n = esperar(texto)
    x1, y1, x2, y2 = caja(n)
    adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))
    return n


def captura(nombre):
    (SALIDA / (nombre+'.png')).write_bytes(adb('exec-out', 'screencap', '-p'))


def limites():
    w, h = map(int, re.findall(r'(\d+)x(\d+)', adb('shell', 'wm', 'size').decode())[-1])
    ventanas = adb('shell', 'dumpsys', 'window', 'displays').decode()
    arriba = re.findall(r'type=statusBars frame=\[0,0\]\[\d+,(\d+)\][^\n]*visible=true', ventanas)
    abajo = re.findall(r'type=navigationBars frame=\[0,(\d+)\]\[\d+,\d+\][^\n]*visible=true', ventanas)
    ime = re.findall(r'type=ime frame=\[0,(\d+)\]\[\d+,\d+\][^\n]*visible=true', ventanas)
    return w, h, max(map(int, arriba), default=0), min(map(int, abajo), default=h), min(map(int, ime), default=h)


resultados = []
superados = []
error = None
actual = ''


def comprobar(texto, teclado=False):
    n = esperar(texto)
    x1, y1, x2, y2 = caja(n)
    w, h, superior, inferior, ime = limites()
    limite = min(inferior, ime) if teclado else inferior
    assert 0 <= x1 < x2 <= w and superior <= y1 < y2 <= limite + 2, f'{actual}/{texto}: {caja(n)} fuera de {superior}..{limite}'
    resultados.append({'caso': actual, 'control': texto, 'bounds': caja(n), 'superior': superior, 'inferior': limite})


def desplazar(hacia_abajo=True):
    w, h, superior, inferior, ime = limites()
    fin = min(inferior, ime)
    scrolls = [n for n in arbol().iter('node') if n.get('scrollable') == 'true' and 'ScrollView' in n.get('class', '')]
    if scrolls:
        region = max(scrolls, key=lambda n: (caja(n)[2]-caja(n)[0])*(caja(n)[3]-caja(n)[1]))
        superior = max(superior, caja(region)[1])
        fin = min(fin, caja(region)[3])
    alto = max(150, int((fin-superior)*0.65))
    y = int(superior+(fin-superior)*0.85)
    otro = max(superior+80, y-alto)
    # El margen pertenece al scroll de la página, no al editor multilínea.
    x = max(12, int(w*0.03))
    adb('shell', 'input', 'swipe', str(x), str(y if hacia_abajo else otro), str(x), str(otro if hacia_abajo else y), '260')


def encontrar_desplazando(texto, hacia_abajo=True):
    for _ in range(16):
        n = buscar(texto)
        if n is not None:
            # Evitar aceptar una fila recortada en el borde del scroll.
            _, _, top, bottom, ime = limites()
            if caja(n)[1] >= top and caja(n)[3] <= min(bottom, ime):
                return n
        desplazar(hacia_abajo)
    raise AssertionError('No se pudo alcanzar: '+texto)


original_font = adb('shell', 'settings', 'get', 'system', 'font_scale').decode().strip()
original_nav = adb('shell', 'settings', 'get', 'secure', 'navigation_mode').decode().strip()
original_size = adb('shell', 'wm', 'size').decode()
original_density = adb('shell', 'wm', 'density').decode()
try:
    for nombre, tamano, densidad, escala, recorte, navegacion, tema in CASOS:
        actual = nombre
        print('Revisando '+nombre, flush=True)
        adb('shell', 'input', 'keyevent', '4')
        adb('shell', 'wm', 'size', tamano)
        adb('shell', 'wm', 'density', densidad)
        adb('shell', 'settings', 'put', 'system', 'font_scale', escala)
        adb('shell', 'cmd', 'overlay', 'enable-exclusive', '--category', 'com.android.internal.display.cutout.emulation.'+recorte)
        adb('shell', 'cmd', 'overlay', 'enable-exclusive', '--category', 'com.android.internal.systemui.navbar.'+navegacion)
        time.sleep(1.5)  # Esperar la recreación de actividades por los ajustes del sistema.
        adb('shell', 'pm', 'clear', 'host.exp.exponent')
        adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', f'exp://127.0.0.1:{PUERTO}', '-p', 'host.exp.exponent')
        tocar('Continue')
        tocar('Close')
        with urllib.request.urlopen('http://127.0.0.1:8768/fixture') as r:
            fixture = json.load(r)
        token = fixture['sesion']['access_token']
        url = f'exp://127.0.0.1:{PUERTO}/--/#access_token={token}&refresh_token=preview-refresh'
        adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', shlex.quote(url), '-p', 'host.exp.exponent')
        esperar('Tu pregunta')
        tocar('Perfil')
        encontrar_desplazando('Tema '+tema, False)
        tocar('Tema '+tema)
        tocar('Portada')
        esperar('Abrir menú editorial')
        comprobar('Abrir menú editorial')
        captura(nombre+'-portada')
        tocar('Abrir menú editorial')
        comprobar('Cerrar menú editorial')
        captura(nombre+'-menu')
        tocar('Cerrar menú editorial')
        tocar('Ubicación simulada:')
        comprobar('Listo')
        encontrar_desplazando('Quetzaltenango')
        comprobar('Quetzaltenango')
        captura(nombre+'-atlas')
        tocar('Quetzaltenango')
        tocar('Chat')
        comprobar('Tu pregunta')
        tocar('Tu pregunta')
        adb('shell', 'input', 'keyevent', '--longpress', 'KEYCODE_MOVE_END')
        adb('shell', 'input', 'text', 'Prueba%scon%steclado')
        adb('shell', 'input', 'keyevent', '66')
        adb('shell', 'input', 'text', 'Segunda%slinea')
        comprobar('Tu pregunta', teclado=True)
        comprobar('Enviar pregunta', teclado=True)
        assert limites()[4] < limites()[1], 'El teclado debe estar abierto.'
        captura(nombre+'-teclado')
        tocar('Enviar pregunta')
        adb('shell', 'input', 'keyevent', '4')
        encontrar_desplazando('FUENTES DE ESTA RESPUESTA')
        captura(nombre+'-respuesta')
        encontrar_desplazando('El festival de cine anuncia su selección centroamericana')
        tocar('El festival de cine anuncia su selección centroamericana')
        esperar('Notas al margen')
        encontrar_desplazando('Ir a las comprobaciones')
        comprobar('Ir a las comprobaciones')
        tocar('Ir a las comprobaciones')
        esperar('Ficha de verificación')
        captura(nombre+'-lectura')
        adb('shell', 'input', 'keyevent', '4')
        tocar('Redacción')
        encontrar_desplazando('Titular', False)
        tocar('Titular')
        adb('shell', 'input', 'text', 'Titular%sde%sprueba')
        encontrar_desplazando('Enviar a validación')
        comprobar('Enviar a validación', teclado=True)
        captura(nombre+'-publicar-teclado')
        adb('shell', 'input', 'keyevent', '4')
        # No se envía una publicación: esta prueba verifica accesibilidad del control.
        superados.append(nombre)
        print('OK '+nombre, flush=True)
except Exception as exc:
    error = str(exc)
    captura(actual+'-fallo')
    (SALIDA/(actual+'-fallo.xml')).write_bytes(ET.tostring(arbol(), encoding='utf-8'))
    (SALIDA/(actual+'-ventanas.txt')).write_bytes(adb('shell','dumpsys','window','displays'))
    raise
finally:
    adb('shell', 'input', 'keyevent', '4')
    adb('shell', 'wm', 'size', re.search(r'Override size: (\d+x\d+)', original_size).group(1) if 'Override size:' in original_size else 'reset')
    adb('shell', 'wm', 'density', re.search(r'Override density: (\d+)', original_density).group(1) if 'Override density:' in original_density else 'reset')
    adb('shell', 'settings', 'put', 'system', 'font_scale', original_font if original_font != 'null' else '1.0')
    adb('shell', 'cmd', 'overlay', 'enable-exclusive', '--category', 'com.android.internal.systemui.navbar.'+('threebutton' if original_nav == '0' else 'gestural'))
    adb('shell', 'cmd', 'overlay', 'disable', 'com.android.internal.display.cutout.emulation.hole')
    adb('shell', 'cmd', 'overlay', 'disable', 'com.android.internal.display.cutout.emulation.tall')
    (SALIDA/'resultados.json').write_text(json.dumps({'resultado': 'fallo' if error else 'ok', 'error': error, 'escenarios_superados': superados, 'android': adb('shell','getprop','ro.build.version.release').decode().strip(), 'api': adb('shell','getprop','ro.build.version.sdk').decode().strip(), 'comprobaciones': resultados}, indent=2), encoding='utf-8')
print(f'OK: {len(CASOS)} escenarios, {len(resultados)} comprobaciones. Evidencia: {SALIDA}')
