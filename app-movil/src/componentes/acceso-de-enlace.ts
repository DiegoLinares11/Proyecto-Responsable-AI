import { Platform } from 'react-native';

type TeclaDeEnlace = {
  key: string;
  repeat: boolean;
  target: unknown;
  currentTarget: { click: () => void };
  preventDefault: () => void;
};

// React Native Web 0.21 trata role="link" como un enlace nativo, aunque
// Pressable genere un div sin href. Enter debe activar su clic existente.
// No se invoca otra acción ni se incorpora esta API de DOM al camino nativo.
export const ACCESO_DE_ENLACE = Platform.OS === 'web' ? {
  onKeyDown(evento: TeclaDeEnlace) {
    if (evento.key === 'Enter' && !evento.repeat && evento.target === evento.currentTarget) {
      evento.preventDefault();
      evento.currentTarget.click();
    }
  },
} : {};
