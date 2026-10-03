// Las pestañas nativas: la barra de iOS y la de Android, no una imitación. Es
// lo que hace que la app se sienta app. El chat va primero porque el enunciado
// lo pide como pantalla inicial.

import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useColores } from '@/constants/tema';

export default function Pestanas() {
  const c = useColores();

  return (
    <NativeTabs backgroundColor={c.papel} indicatorColor={c.papelHundido} tintColor={c.acento}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right.fill" md="chat" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Label>Portada</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="newspaper.fill" md="newspaper" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
