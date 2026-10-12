// ===========================================================================
// Las reglas del panel de administración
//
// Lo que se prueba es qué deja hacer el panel. La otra mitad —que desde una
// sesión el rol no se cambia aunque se llame a la API a mano— la prueba la
// suite de RLS con el trigger `impedir_autoascenso`.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { validarCambioDeRol } from "../../../src/modules/usuarios/roles.ts";

const base = {
  idActor: "admin-1",
  idUsuario: "persona-2",
  rolActual: "lector",
  rolNuevo: "publicador",
  motivo: "Escribe para la sección de cultura del medio aliado",
};

describe("qué deja hacer el panel", () => {
  test("un administrador hace publicador a un lector, con motivo", () => {
    assert.equal(validarCambioDeRol(base), null);
  });

  test("y lo vuelve a lector, o lo hace moderador", () => {
    assert.equal(validarCambioDeRol({ ...base, rolActual: "publicador", rolNuevo: "lector" }), null);
    assert.equal(validarCambioDeRol({ ...base, rolNuevo: "moderador" }), null);
  });

  test("nadie cambia su propio rol, ni para subir ni para bajar", () => {
    assert.match(validarCambioDeRol({ ...base, idUsuario: "admin-1" }) ?? "", /propio rol/);
  });

  test("desde el panel no se nombran administradores", () => {
    assert.match(validarCambioDeRol({ ...base, rolNuevo: "administrador" }) ?? "", /servidor/);
  });

  test("ni se le cambia el rol a otro administrador", () => {
    assert.match(validarCambioDeRol({ ...base, rolActual: "administrador", rolNuevo: "lector" }) ?? "", /servidor/);
  });

  test("un rol inventado no pasa", () => {
    assert.notEqual(validarCambioDeRol({ ...base, rolNuevo: "superusuario" }), null);
  });

  test("sin motivo, o con uno de relleno, no se cambia", () => {
    assert.match(validarCambioDeRol({ ...base, motivo: "" }) ?? "", /motivo/);
    assert.match(validarCambioDeRol({ ...base, motivo: "   ok   " }) ?? "", /motivo/);
  });

  test("darle el rol que ya tiene es un error, no un cambio que se audita", () => {
    assert.match(validarCambioDeRol({ ...base, rolActual: "publicador" }) ?? "", /ya tiene/);
  });
});
