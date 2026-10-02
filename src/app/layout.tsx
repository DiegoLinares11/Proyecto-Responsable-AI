export const metadata = { title: "Noticias Verificadas" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-GT">
      <body>{children}</body>
    </html>
  );
}
