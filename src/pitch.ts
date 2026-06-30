import type { Customer, Product } from "./types.js";

/**
 * Genera el mensaje de venta para una oferta.
 *
 * Hoy es un MOCK: devuelve un texto fijo para que el ejercicio corra sin
 * depender de credenciales. Una de las extensiones posibles es reemplazar
 * esto por una llamada real a un LLM (Claude) que arme un pitch persuasivo
 * a partir del producto, el motivo y el historial del distribuidor.
 */
export function generatePitch(
  product: Product,
  customer: Customer,
  motivo: string,
): string {
  return `[${motivo}] ${customer.nombre}: sumá ${product.nombre} ($${product.precioCaja}/caja).`;
}
