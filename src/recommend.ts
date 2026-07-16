import type { Customer, Offer, Product } from "./types.js";
import { products, productById, customers } from "./data.js";
import { generatePitch } from "./pitch.js";

const MAX_OFFERS = 3;
const REPOSICION_MAX = 2;

const ventasGlobalesPorSku: Record<string, number> = {};
for (const c of customers) {
  for (const compra of c.historial) {
    ventasGlobalesPorSku[compra.sku] =
      (ventasGlobalesPorSku[compra.sku] ?? 0) + compra.cajas;
  }
}
const ventasGlobales = (sku: string): number => ventasGlobalesPorSku[sku] ?? 0;

/** El cliente ya pasó su frecuencia habitual desde la última compra. */
function estaVencido(customer: Customer): boolean {
  if (customer.frecuenciaDias == null || customer.historial.length === 0) {
    return false;
  }
  const ultimaCompra = Math.max(
    ...customer.historial.map((p) => new Date(p.fecha).getTime()),
  );
  const diasDesdeUltimaCompra =
    (Date.now() - ultimaCompra) / (1000 * 60 * 60 * 24);
  return diasDesdeUltimaCompra >= customer.frecuenciaDias;
}

/** Total de cajas por sku dentro del historial del cliente, para priorizar reposición. */
function cajasPorSku(customer: Customer): Map<string, number> {
  const map = new Map<string, number>();
  for (const compra of customer.historial) {
    map.set(compra.sku, (map.get(compra.sku) ?? 0) + compra.cajas);
  }
  return map;
}

/**
 * Candidatos de cross-sell: productos que el cliente no compró, de una familia
 * que ya compra (ej: Coca sí, Sprite no) o de una familia complementaria
 * (campo `complementos`). Ordenados por ventas globales.
 */
function candidatosCrossSell(customer: Customer): Product[] {
  const skusComprados = new Set(customer.historial.map((p) => p.sku));
  const familiasElegibles = new Set<string>();
  for (const sku of skusComprados) {
    const producto = productById(sku);
    if (!producto) continue;
    familiasElegibles.add(producto.familia);
    for (const complemento of producto.complementos) {
      familiasElegibles.add(complemento);
    }
  }
  return products
    .filter((p) => familiasElegibles.has(p.familia) && !skusComprados.has(p.id))
    .sort((a, b) => ventasGlobales(b.id) - ventasGlobales(a.id));
}

/** Combo de entrada para clientes sin historial: bestsellers de familias distintas. */
function comboEntrada(): Product[] {
  const ordenados = [...products].sort(
    (a, b) => ventasGlobales(b.id) - ventasGlobales(a.id),
  );
  const familiasUsadas = new Set<string>();
  const combo: Product[] = [];
  for (const producto of ordenados) {
    if (combo.length >= MAX_OFFERS || familiasUsadas.has(producto.familia)) {
      continue;
    }
    familiasUsadas.add(producto.familia);
    combo.push(producto);
  }
  return combo;
}

export function recommend(customer: Customer): Offer[] {
  const offers: Offer[] = [];
  const usados = new Set<string>();

  const agregar = (producto: Product, motivo: string) => {
    if (offers.length >= MAX_OFFERS || usados.has(producto.id)) return;
    usados.add(producto.id);
    offers.push({
      product: producto,
      motivo,
      mensaje: generatePitch(producto, customer, motivo),
    });
  };

  if (customer.historial.length === 0) {
    for (const producto of comboEntrada()) agregar(producto, "entrada");
    return offers;
  }

  if (estaVencido(customer)) {
    const masRepuestos = [...cajasPorSku(customer).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, REPOSICION_MAX);
    for (const [sku] of masRepuestos) {
      const producto = productById(sku);
      if (producto) agregar(producto, "reposicion");
    }
  }

  for (const producto of candidatosCrossSell(customer)) {
    if (offers.length >= MAX_OFFERS) break;
    agregar(producto, "cross-sell");
  }

  if (offers.length < MAX_OFFERS) {
    const skusComprados = new Set(customer.historial.map((p) => p.sku));
    const bestsellers = [...products].sort(
      (a, b) => ventasGlobales(b.id) - ventasGlobales(a.id),
    );
    for (const producto of bestsellers) {
      if (offers.length >= MAX_OFFERS) break;
      if (skusComprados.has(producto.id)) continue;
      agregar(producto, "cross-sell");
    }
  }

  return offers;
}
