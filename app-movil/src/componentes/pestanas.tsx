// Las pestañas nativas: la barra de iOS y la de Android, no una imitación. Es
// lo que hace que la app se sienta app. El chat va primero porque el enunciado
// lo pide como pantalla inicial.

import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useColores } from '@/constants/tema';
import { usePermisos } from '@/lib/permisos';

export default function Pestanas() {
  const c = useColores();
  // La pestaña de la redacción solo para cuentas con algún permiso. Ocultarla
  // decide qué se muestra; el backend y la base deciden qué se puede hacer.
  const { redaccion } = usePermisos();

  return (
    <NativeTabs backgroundColor={c.papel} indicatorColor={c.verificadoFondo} tintColor={c.acento}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right.fill" md="chat" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Label>Portada</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="newspaper.fill" md="newspaper" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="redaccion" hidden={!redaccion}>
        <NativeTabs.Trigger.Label>Redacción</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.and.pencil" md="edit_note" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
