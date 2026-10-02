"use client";

// ===========================================================================
// La ventana del chatbot
//
// Un detalle de diseño que no es cosmético: cuando una respuesta se bloquea, la
// ventana **dice qué capa la bloqueó**. En una aplicación normal eso sería ruido
// técnico; en este proyecto es el entregable. Quien evalúe esto tiene que poder
// intentar romperlo y ver en pantalla por qué falló.
// ===========================================================================

import { useRef, useState } from "react";

type Turno = {
  rol: "usuario" | "asistente";
  texto: string;
  nota?: string;
};

const SALUDO: Turno = {
  rol: "asistente",
  texto:
    "Puedo responder sobre las noticias publicadas acá. Preguntame por lo más relevante del día, " +
    "por un tema, o por una noticia en particular.",
};

export function VentanaDelChatbot() {
  const [abierta, setAbierta] = useState(false);
  const [turnos, setTurnos] = useState<Turno[]>([SALUDO]);
  const [esperando, setEsperando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const mensaje = campo.current?.value.trim() ?? "";
    if (mensaje === "" || esperando) return;

    if (campo.current !== null) campo.current.value = "";
    setTurnos((previos) => [...previos, { rol: "usuario", texto: mensaje }]);
    setEsperando(true);

    try {
      const respuesta = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mensaje }),
      });

      const cuerpo = (await respuesta.json()) as {
        respuesta?: string;
        capaQueCorto?: string | null;
        categoria?: string | null;
        error?: string;
      };

      if (!respuesta.ok) {
        setTurnos((previos) => [
          ...previos,
          { rol: "asistente", texto: cuerpo.error ?? `Error ${respuesta.status}.` },
        ]);
        return;
      }

      const nota =
        cuerpo.capaQueCorto == null
          ? undefined
          : `Bloqueado en ${cuerpo.capaQueCorto}` +
            (cuerpo.categoria == null ? "" : ` · clasificado como ${cuerpo.categoria}`);

      setTurnos((previos) => [
        ...previos,
        {
          rol: "asistente",
          texto: cuerpo.respuesta ?? "(sin respuesta)",
          ...(nota === undefined ? {} : { nota }),
        },
      ]);
    } catch (error) {
      setTurnos((previos) => [
        ...previos,
        {
          rol: "asistente",
          texto: `No se pudo contactar al servidor: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ]);
    } finally {
      setEsperando(false);
    }
  }

  if (!abierta) {
    return (
      <div className="chat">
        <button className="abrir" onClick={() => setAbierta(true)}>
          Preguntar sobre las noticias
        </button>
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="panel">
        <header>
          <span>Consulta sobre las noticias</span>
          <button onClick={() => setAbierta(false)} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className="turnos">
          {turnos.map((turno, indice) => (
            <div className={`turno ${turno.rol}`} key={indice}>
              {turno.texto}
              {turno.nota === undefined ? null : <span className="nota">{turno.nota}</span>}
            </div>
          ))}
          {esperando ? (
            <div className="turno asistente" style={{ color: "var(--tinta-suave)" }}>
              Buscando en las noticias publicadas…
            </div>
          ) : null}
        </div>

        <form onSubmit={enviar}>
          <input
            ref={campo}
            placeholder="¿Qué hay de nuevo hoy?"
            maxLength={2000}
            disabled={esperando}
          />
          <button type="submit" disabled={esperando}>
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
