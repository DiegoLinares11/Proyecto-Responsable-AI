// ===========================================================================
// El gasto del chatbot (R-11)
//
// Solo para cuentas con `usuarios_administrar`. El total es el mismo número que
// usa el tope para cortar el chat (`vista_gasto_api`); el desglose dice cuánto
// cuesta cada función. La lógica vive en src/modules/gasto.
// ===========================================================================

import { entornoDelModelo } from "../../lib/entorno.ts";
import { perfilDelVisitante } from "../../lib/supabase-servidor.ts";
import { clienteDeServicio } from "../../lib/supabase.ts";
import { modelosDeGuardiaConfigurados } from "../../modules/chatbot/proveedor/index.ts";
import { leerResumenDeGasto } from "../../modules/gasto/index.ts";

export const dynamic = "force-dynamic";

const usd = (n: number, decimales = 2) => `USD ${n.toFixed(decimales)}`;

export default async function Gasto() {
  const perfil = await perfilDelVisitante();

  if (perfil === null) {
    return (
      <article>
        <h2 style={{ fontSize: "1.2rem" }}>Gasto</h2>
        <p>
          Hay que <a href="/entrar">entrar</a>.
        </p>
      </article>
    );
  }

  if (!perfil.permisos.has("usuarios_administrar")) {
    return (
      <article>
        <h2 style={{ fontSize: "1.2rem" }}>Gasto</h2>
        <p>
          Tu cuenta es <strong>{perfil.rol}</strong> y no tiene el permiso <code>usuarios_administrar</code>.
        </p>
      </article>
    );
  }

  // Con el permiso comprobado, la llave de servicio: ninguna sesión lee estas vistas.
  const configuracion = entornoDelModelo();
  const resumen = await leerResumenDeGasto(clienteDeServicio(), {
    topeUsd: configuracion.topeGastoUsd,
    creditoUsd: configuracion.creditoUsd,
    modelosDeGuardia: modelosDeGuardiaConfigurados(),
  });

  return (
    <article className="administracion">
      <h2 style={{ fontSize: "1.2rem" }}>Gasto del chatbot</h2>
      <p style={{ color: "var(--tinta-suave)", fontSize: "0.875rem" }}>
        El total es el mismo número que usa el tope para cortar el chat. Al llegar al tope, el chat
        deja de llamar al modelo y avisa, en vez de fallar cuando se acabe el crédito.
      </p>

      <table>
        <tbody>
          <tr>
            <th scope="row">Gastado</th>
            <td>{usd(resumen.gastoUsd, 4)}</td>
          </tr>
          <tr>
            <th scope="row">Tope del servidor</th>
            <td>
              {usd(resumen.topeUsd)} ({Math.round(resumen.usoDelTope * 100)} % usado)
            </td>
          </tr>
          <tr>
            <th scope="row">Margen antes del tope</th>
            <td>
              {usd(resumen.margenUsd)}
              {resumen.respuestasRestantes === null
                ? null
                : `, unas ${resumen.respuestasRestantes.toLocaleString("es-GT")} respuestas al costo promedio`}
            </td>
          </tr>
          {resumen.creditoUsd === null ? null : (
            <tr>
              <th scope="row">Crédito de la cuenta</th>
              <td>{usd(resumen.creditoUsd)}</td>
            </tr>
          )}
          <tr>
            <th scope="row">Turnos con costo</th>
            <td>{resumen.turnos.toLocaleString("es-GT")}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ fontSize: "1rem", marginTop: "1.5rem" }}>Cuánto cuesta cada función</h3>
      <table>
        <thead>
          <tr>
            <th>Hasta dónde llegó</th>
            <th>Turnos</th>
            <th>Costo promedio</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {resumen.porFuncion.map((f) => (
            <tr key={f.funcion}>
              <td>
                <strong>{f.nombre}</strong>
                {f.modelos.length > 0 ? <code style={{ marginLeft: "0.4rem" }}>{f.modelos.join(", ")}</code> : null}
                <div style={{ fontSize: "0.8rem", color: "var(--tinta-suave)" }}>{f.explicacion}</div>
              </td>
              <td>{f.turnos.toLocaleString("es-GT")}</td>
              <td>{usd(f.promedioUsd, 4)}</td>
              <td>{usd(f.gastoUsd, 4)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ color: "var(--tinta-suave)", fontSize: "0.8125rem", marginTop: "1rem" }}>
        No incluye las corridas del red team: sus turnos no se guardan, para no mezclar ataques con
        tráfico real. Su costo está en <code>docs/red-team.md</code>.
      </p>
    </article>
  );
}
