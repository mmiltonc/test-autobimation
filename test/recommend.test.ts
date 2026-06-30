import { test } from "node:test";
import assert from "node:assert/strict";
import { recommend } from "../src/recommend.js";
import { customers } from "../src/data.js";

test("ofrece productos a un distribuidor activo", () => {
  const activo = customers.find((c) => c.historial.length > 0)!;
  const offers = recommend(activo);

  assert.ok(offers.length > 0, "debería devolver al menos una oferta");
  assert.ok(offers.length <= 3, "máximo 3 ofertas");
  assert.ok(offers[0].mensaje, "cada oferta necesita un mensaje de venta");
  assert.ok(offers[0].motivo, "cada oferta necesita un motivo");
});

test("activa a un distribuidor sin historial", () => {
  const nuevo = customers.find((c) => c.historial.length === 0)!;
  const offers = recommend(nuevo);

  assert.ok(offers.length > 0, "también hay que ofrecerle algo al que no compra");
});
