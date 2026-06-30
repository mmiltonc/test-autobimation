import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Customer, Product } from "./types.js";

const dir = join(import.meta.dirname, "..", "data");

export const products: Product[] = JSON.parse(
  readFileSync(join(dir, "products.json"), "utf8"),
);

export const customers: Customer[] = JSON.parse(
  readFileSync(join(dir, "customers.json"), "utf8"),
);

export const productById = (id: string): Product | undefined =>
  products.find((p) => p.id === id);
