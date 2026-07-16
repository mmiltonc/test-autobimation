import type { Customer, Offer, Product, Purchase } from "./types.js";
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

/** Catálogo ordenado por ventas globales desc, calculado una sola vez. */
const productosPorVentas: Product[] = [...products].sort(
  (a, b) => ventasGlobales(b.id) - ventasGlobales(a.id),
);

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

/** Compras de un sku puntual, ordenadas cronológicamente. */
function comprasPorSku(customer: Customer, sku: string): Purchase[] {
  return customer.historial
    .filter((p) => p.sku === sku)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

/**
 * Detecta tendencia de volumen en las compras repetidas de un sku:
 *  - en ascenso: sugiere última + la misma diferencia hacia arriba.
 *  - en descenso: sugiere el valor mayor más próximo al último pedido
 *    (el "escalón" ya alcanzado más cercano, no necesariamente el máximo histórico).
 *  - sin cambio o sin repetición: no hay upsell.
 */
function cantidadSugeridaUpsell(customer: Customer, sku: string): number | null {
  const compras = comprasPorSku(customer, sku);
  if (compras.length < 2) return null;

  const ultima = compras[compras.length - 1].cajas;
  const penultima = compras[compras.length - 2].cajas;

  if (ultima > penultima) return ultima + (ultima - penultima);
  if (ultima < penultima) {
    const mayores = compras.map((c) => c.cajas).filter((c) => c > ultima);
    return Math.min(...mayores);
  }
  return null;
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
  return productosPorVentas.filter(
    (p) => familiasElegibles.has(p.familia) && !skusComprados.has(p.id),
  );
}

/** Combo de entrada para clientes sin historial: bestsellers de familias distintas. */
function comboEntrada(): Product[] {
  const familiasUsadas = new Set<string>();
  const combo: Product[] = [];
  for (const producto of productosPorVentas) {
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

  const agregar = (
    producto: Product,
    motivo: string,
    cantidadSugerida?: number | null,
  ) => {
    if (offers.length >= MAX_OFFERS || usados.has(producto.id)) return;
    usados.add(producto.id);
    const base = generatePitch(producto, customer, motivo);
    const mensaje =
      cantidadSugerida != null
        ? `${base} Pedido sugerido: ${cantidadSugerida} cajas.`
        : base;
    offers.push({ product: producto, motivo, mensaje });
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
      if (!producto) continue;
      const cantidadSugerida = cantidadSugeridaUpsell(customer, sku);
      const motivo = cantidadSugerida != null ? "upsell" : "reposicion";
      agregar(producto, motivo, cantidadSugerida);
    }
  }

  for (const producto of candidatosCrossSell(customer)) {
    if (offers.length >= MAX_OFFERS) break;
    agregar(producto, "cross-sell");
  }

  if (offers.length < MAX_OFFERS) {
    const skusComprados = new Set(customer.historial.map((p) => p.sku));
    for (const producto of productosPorVentas) {
      if (offers.length >= MAX_OFFERS) break;
      if (skusComprados.has(producto.id)) continue;
      agregar(producto, "cross-sell");
    }
  }

  return offers;
}
