export interface Product {
  id: string;
  nombre: string;
  marca: string;
  familia: string;
  precioCaja: number;
  unidadesPorCaja: number;
  /** Familias que suelen venderse junto a esta (para cross-sell). */
  complementos: string[];
}

export interface Purchase {
  sku: string;
  cajas: number;
  /** Fecha ISO de la compra. */
  fecha: string;
}

export interface Customer {
  id: string;
  nombre: string;
  /** Cada cuántos días suele reponer. null = nunca compró. */
  frecuenciaDias: number | null;
  historial: Purchase[];
}

export interface Offer {
  product: Product;
  /** Por qué se la ofrecemos: "reposicion" | "cross-sell" | "upsell" | "entrada". */
  motivo: string;
  /** Mensaje de venta para el distribuidor (lo arma generatePitch). */
  mensaje: string;
}
