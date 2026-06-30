import type { Customer, Offer } from "./types.js";
// Disponibles para tu solución:
// import { products, productById } from "./data.js";
// import { generatePitch } from "./pitch.js";

/**
 * TODO (candidato): devolvé hasta 3 ofertas para este distribuidor.
 *
 * La lógica debería distinguir dos situaciones:
 *
 *  - Distribuidor que YA compra (tiene historial):
 *      · reposición de lo que reordena seguido,
 *      · cross-sell del portfolio que todavía no lleva (ej: compra Coca pero no Sprite),
 *      · upsell de volumen.
 *
 *  - Distribuidor nuevo o inactivo (historial vacío):
 *      · combo de entrada / bestsellers para que empiece a comprar.
 *
 * Para el mensaje de cada oferta usá generatePitch(product, customer, motivo).
 *
 * Devolvé como máximo 3 ofertas.
 */
export function recommend(customer: Customer): Offer[] {
  return [];
}
