# Ejercicio: Bot de recomendación para clientes

Sos parte del equipo de un **Autobimation** que le vende a
clientes (kioscos, almacenes, supermercados chicos). Queremos un bot que,
mirando a cada cliente, le ofrezca productos para que **compre más** — o
para que **empiece a comprar** si todavía no lo hace.

## La tarea

Implementá la función `recommend(customer)` en `src/recommend.ts`.

Recibe un cliente y devuelve **hasta 3 ofertas**. Cada oferta tiene:
- `product`: el producto que le ofrecemos,
- `motivo`: por qué (`reposicion` / `cross-sell` / `upsell` / `entrada`),
- `mensaje`: el texto de venta (usá `generatePitch(product, customer, motivo)`).

Tu lógica debería distinguir dos casos:

- **cliente que ya compra** (tiene historial): reponé lo que reordena,
  ofrecele del portfolio que todavía no lleva (cross-sell) y/o subí volumen (upsell).
- **cliente nuevo o inactivo** (historial vacío): ofrecele un combo de
  entrada / bestsellers para que arranque.

No hay una respuesta única. Nos interesa **cómo decidís** qué ofrecer y por qué.

## Setup

```bash
npm install
npm test      # hay tests que fallan hasta que implementes recommend()
npm run dev   # levanta la API en http://localhost:3000
```

Probar el endpoint:

```bash
curl -X POST http://localhost:3000/recommend \
  -H "Content-Type: application/json" \
  -d '{"customerId":"don-jose"}'
```

clientes disponibles: `don-jose`, `la-esquina`, `super-norte`, `recien-llegado`.

## Datos

- `data/products.json` — catálogo (familia, marca, precio por caja, complementos).
- `data/customers.json` — clientes con su historial de compras.

## El mensaje de venta (LLM)

`generatePitch()` hoy es un **mock** que devuelve un texto fijo, así el ejercicio
corre sin credenciales. Si te sobra tiempo, podés reemplazarlo por una llamada
real a un LLM que arme un pitch más persuasivo.

## Tiempo

15–30 minutos. Después lo defendés paso a paso y sumamos una mejora en vivo.
Priorizá que **funcione y se entienda** por encima de cubrir todos los casos.

Pensado para desarrollar con IA, guardar los prompts usados para entender como se trabaja en el dia a dia.
