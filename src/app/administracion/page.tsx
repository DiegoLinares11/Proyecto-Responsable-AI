// ===========================================================================
// Administración: quién puede publicar y moderar
//
// Solo para cuentas con `usuarios_administrar`. Todas las cuentas nuevas
// nacen como lector; acá un administrador las hace publicador o moderador, con
// un motivo que queda en la auditoría, y abajo se ve el historial de cambios.
// ===========================================================================

import { perfilDelVisitante } from "../../lib/supabase-servidor.ts";
import { clienteDeServicio } from "../../lib/supabase.ts";
import { leerCambiosDeRol, leerCuentas, NOMBRE_DE_ROL } from "../../modules/usuarios/roles.ts";
import { FilaDeCuenta } from "./fila.tsx";

export const dynamic = "force-dynamic";

export default async function Administracion({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const perfil = await perfilDelVisitante();

  if (perfil === null) {
    return (
      <article>
        <h2 style={{ fontSize: "1.2rem" }}>Administración</h2>
        <p>
          Hay que <a href="/entrar">entrar</a>.
        </p>
      </article>
    );
  }

  if (!perfil.permisos.has("usuarios_administrar")) {
    return (
      <article>
        <h2 style={{ fontSize: "1.2rem" }}>Administración</h2>
        <p>
          Tu cuenta es <strong>{perfil.rol}</strong> y no tiene el permiso <code>usuarios_administrar</code>.
        </p>
      </article>
    );
  }

  // Recién acá, con el permiso comprobado, se usa la llave de servicio: el
  // correo de las cuentas no se puede leer con una sesión.
  const conDemostracion = (await searchParams)["demo"] === "1";
  const servicio = clienteDeServicio();
  const [cuentas, cambios] = await Promise.all([leerCuentas(servicio, conDemostracion), leerCambiosDeRol(servicio)]);

  return (
    <article className="administracion">
      <h2 style={{ fontSize: "1.2rem" }}>Cuentas y permisos</h2>
      <p style={{ color: "var(--tinta-suave)", fontSize: "0.875rem" }}>
        Toda cuenta nueva entra como <strong>lector</strong>. Acá se la hace publicador (puede mandar
        noticias al canal de validación) o moderador (además decide las que quedan en revisión). Cada
        cambio pide un motivo y queda en la auditoría con tu nombre. Nadie cambia su propio rol, y un
        administrador nuevo se nombra en el servidor, no desde acá.
      </p>
      <p style={{ fontSize: "0.8125rem" }}>
        {conDemostracion ? (
          <a href="/administracion">Ocultar las cuentas de demostración</a>
        ) : (
          <a href="/administracion?demo=1">Mostrar también las cuentas de demostración</a>
        )}
      </p>

      <div className="tabla-con-desplazamiento">
        <table className="cuentas">
          <thead>
            <tr>
              <th>Cuenta</th>
              <th>Creada</th>
              <th>Rol</th>
              <th>Cambiar a</th>
            </tr>
          </thead>
          <tbody>
            {cuentas.map((cuenta) => (
              <FilaDeCuenta key={cuenta.id} cuenta={cuenta} esQuienAdministra={cuenta.id === perfil.usuario.id} />
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize: "1.05rem", marginTop: "2rem" }}>Últimos cambios de rol</h3>
      {cambios.length === 0 ? (
        <p className="vacio">Todavía no hay cambios registrados.</p>
      ) : (
        <ol className="historial">
          {cambios.map((c, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={i}>
              <span className="cuando">
                {new Date(c.cuando).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" })}
              </span>{" "}
              <strong>{c.correo}</strong>: {NOMBRE_DE_ROL[c.de] ?? c.de} → {NOMBRE_DE_ROL[c.a] ?? c.a}
              <span className="motivo">«{c.motivo}» · {c.via}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
