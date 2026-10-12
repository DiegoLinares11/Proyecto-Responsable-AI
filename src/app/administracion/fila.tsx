"use client";

import { useActionState } from "react";

import { cambiarRolDesdeElPanel, type ResultadoDeCambio } from "./acciones.ts";
import { NOMBRE_DE_ROL, ROLES_DEL_PANEL, type Cuenta } from "../../modules/usuarios/roles.ts";

export function FilaDeCuenta({ cuenta, esQuienAdministra }: { cuenta: Cuenta; esQuienAdministra: boolean }) {
  const [estado, accion, guardando] = useActionState<ResultadoDeCambio, FormData>(cambiarRolDesdeElPanel, undefined);

  const fecha = new Date(cuenta.creadaEn).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" });

  return (
    <tr>
      <td>
        <strong>{cuenta.nombre}</strong>
        <span className="correo">{cuenta.correo}</span>
      </td>
      <td>{fecha}</td>
      <td>
        <span className={`rol rol-${cuenta.rol}`}>{NOMBRE_DE_ROL[cuenta.rol] ?? cuenta.rol}</span>
      </td>
      <td>
        {esQuienAdministra ? (
          <span className="pista">Es tu cuenta: nadie cambia su propio rol.</span>
        ) : cuenta.rol === "administrador" ? (
          <span className="pista">Un administrador se cambia en el servidor.</span>
        ) : (
          <form action={accion} className="cambio-de-rol">
            <input type="hidden" name="id_usuario" value={cuenta.id} />
            <label>
              <span className="oculto">Rol nuevo para {cuenta.correo}</span>
              <select name="rol" defaultValue={cuenta.rol}>
                {ROLES_DEL_PANEL.map((r) => (
                  <option key={r} value={r}>
                    {NOMBRE_DE_ROL[r]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="oculto">Motivo del cambio</span>
              <input name="motivo" placeholder="Motivo (queda en la auditoría)" minLength={10} maxLength={300} required />
            </label>
            <button type="submit" disabled={guardando}>
              {guardando ? "Guardando…" : "Cambiar"}
            </button>
            {estado === undefined ? null : "error" in estado ? (
              <p className="error">{estado.error}</p>
            ) : (
              <p className="exito">{estado.ok}</p>
            )}
          </form>
        )}
      </td>
    </tr>
  );
}
