import type { ReactNode } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

/** Web: el navegador de pestañas aplica los márgenes una sola vez.
 * Nativo: cada pantalla protege arriba y los costados; la barra nativa maneja
 * abajo. El chat de iOS reserva su propio borde inferior para el compositor.
 */
export function AreaDePestana({ children, style, compositor = false }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; compositor?: boolean;
}) {
  const edges: Edge[] = Platform.OS === 'web' ? [] : ['top', 'left', 'right'];
  if (Platform.OS === 'ios' && compositor) edges.push('bottom');
  return <SafeAreaView style={style} edges={edges}>{children}</SafeAreaView>;
}
