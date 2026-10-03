// En el teléfono, la sesión se guarda con el `localStorage` que instala
// expo-sqlite: es lo que recomienda la guía de Expo para Supabase y funciona en
// Expo Go. En la web el navegador ya tiene uno (ver almacen.web.ts).
import 'expo-sqlite/localStorage/install';

export const almacen = localStorage;
