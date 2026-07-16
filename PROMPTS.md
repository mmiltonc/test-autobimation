# Prompts utilizados

## 1. Exploración inicial

Estuve revisando el proyecto y README.md y antes de implementar quiero validar la estrategia.

Entiendo que recommend(customer) debe devolver hasta tres ofertas y distinguir entre clientes con historial y clientes sin historial.

Mi idea seria:

Para clientes sin historial, calcular los productos mas vendidos sumando las cajas de todos los historiales y ofrecer un combo de entrada con productos de distintas familias.
Para clientes con historial, revisar si ya superaron su frecuencia habitual de compra. Lo mas probable es que si hayan superado la fecha para reposicion. por las fechas de los datos que son de Junio. No quiero cambiar las fechas de los datos o crear una funcion para simular una fecha mas cercana. Simplemente si pasaron los dias ofrecer igual reposicion.
Si corresponde reposicion, priorizar los productos que compran repetidamente o en mayor volumen.
Para cross-sell, buscar productos que todavia no compraron y que pertenezcan a familias complementarias.
Como criterio priorizar los productos con mas ventas globales.
Evitar productos duplicados y devolver como maximo tres ofertas.
Mantener el mock de generatePitch() y no conectar un LLM real en esta primera version.

Revisa el README, los tipos, los datos, los tests y los archivos de src para tener mas contexto.

Por ahora no modifiques ningun archivo. Solo decime/indicame lo siguiente:

Si mi interpretacion coincide con la consigna.
Que ambiguedades o problemas encontras.
Que otras reglas simples implementarias.
Como ordenarias las ofertas.
Que casos probarias.
Que archivos necesitarian modificarse.

Busco una solucion sencilla, que funcione y facil de implementar en corto tiempo.

### Resultado

Repaso hecho

Leí README, types.ts, recommend.ts, data.ts, pitch.ts, server.ts, ambos JSON de datos, el test y package.json. Test runner: node:test vía tsx --test test/recommend.test.ts.

---
1. ¿Tu interpretación coincide con la consigna?

En líneas generales sí, pero hay un punto que se aparta del ejemplo que da el propio README:

▎ "ofrecele del portfolio que todavía no lleva (cross-sell) (ej: compra Coca pero no Sprite)"

Coca y Sprite son de la misma familia (gaseosas). O sea, el propio README ejemplifica cross-sell como "otra marca dentro de una familia que ya compra", no como "familia complementaria". Tu plan define cross-sell únicamente vía el campo complementos (familias distintas), lo cual coincide con el comentario de types.ts ("Familias que suelen venderse junto a esta (para cross-sell)") pero deja afuera el caso Coca/Sprite del README.

Mi recomendación: ampliar el pool de cross-sell para incluir dos fuentes, ambas rankeadas por ventas globales:
- productos de familias que ya compra pero de otro SKU (ej. Coca sí, Sprite no) — cubre el ejemplo del README.
- productos de familias complementarias (complementos) que no compra — cubre el uso explícito del campo.

Es una sola función ("candidatos no comprados, de familia propia o complementaria") sin duplicar lógica.

Sobre upsell: tu plan no lo contempla. Está bien — el README lo pone como opcional ("cross-sell y/o upsell") y remata con "priorizá que funcione y se entienda por encima de cubrir todos los casos". Yo también lo dejaría afuera en esta primera vuelta; si sobra tiempo, la forma más simple de meterlo sin inventar variantes de producto sería "subí volumen" sobre el mismo producto que ya repone (mismo product, motivo upsell, mensaje que sugiera más cajas), no un producto nuevo.

---
2. Ambigüedades / problemas que encontré

- Definición de cross-sell (arriba) — la más importante, cambia el resultado.
- "Hoy" no está definido en el código. Vas a usar new Date() real. Con la fecha del sistema (2026-07-16) los tres clientes activos ya están vencidos en su frecuencia (don-jose: 34 días vs 7; la-esquina: 22 vs 10; super-norte: 19 vs 5), así que tu supuesto se cumple. Buena noticia: es monótono — una vez vencido un plazo, sigue vencido a medida que pasa el tiempo real, nunca "se pone al día" solo. El test no se va a romper por el paso del tiempo.
- frecuenciaDias es del cliente, no del producto. No hay una fecha de última compra por SKU, así que "vencido" solo se puede evaluar a nivel cliente (última compra en todo el historial), no por producto individual. Está bien para decidir si hay reposición, pero no qué producto reponer — para eso usás volumen/repetición como decís vos.
- Cuántos slots de reposición vs cross-sell. No está especificado. Con 3 slots hay que repartir. Ver punto 4.
- Empate en volumen (dos SKUs con mismas cajas totales) no tiene criterio de desempate explícito.
- Caso borde no representado en los datos: cliente con historial pero no vencido, o cliente que ya compró todo el catálogo disponible para cross-sell (no data actual lo fuerza, pero conviene no romper si pasa).

---
3. Otras reglas simples que agregaría

- Fallback de relleno: si reposición + cross-sell dan menos de 3 candidatos, completar los slots restantes con los siguientes bestsellers globales que el cliente no tenga (evita devolver menos ofertas de las posibles sin agregar mucha complejidad).
- Desempate determinístico: ordenar por cajas totales desc, y como segundo criterio por cantidad de compras (repetición), y como tercer criterio por id de producto (para que el resultado sea estable/testeable).
- Combo de entrada diverso: tal como decís, un producto por familia distinta, elegido por ventas globales — evita devolver 3 gaseosas.
- Dedup por producto en todo el pipeline (un Set<string> de ids ya usados, chequeado antes de agregar cada oferta).

---
4. Cómo ordenaría las ofertas

Cliente con historial, vencido:
1. reposicion — top 1–2 productos por volumen histórico (los que compra seguido / en cantidad).
2. cross-sell — resto de los slots, candidatos rankeados por ventas globales.
3. (fallback) bestseller global no comprado, si faltan slots.
Todo el array desde cross-sell, mismo criterio.

Cliente sin historial:
Todo entrada, un producto por familia, rankeado por ventas globales.

Dentro de cada bloque, orden interno = ranking (volumen o ventas globales, desc). Reposición siempre primero porque es la señal más "caliente" (cliente concreto, urgencia real), cross-sell después porque es oportunidad, no urgencia.

---
5. Casos que probaría

Con los tests existentes como base (no los tocaría, ya cubren "activo → ofertas" y "sin historial → ofertas"), agregaría:

- recien-llegado: verificar motivo === "entrada" en las 3 y que las 3 sean de familias distintas.
- don-jose: verificar que aparece reposicion para al menos uno de sus productos con más volumen (coca-225 o quilmes-1l), y que ningún sku recomendado esté ya en su historial salvo el/los de reposición.
- Verificar no duplicados: offers.map(o => o.product.id) sin repetidos.
- Verificar offers.length <= 3 en los cuatro clientes de data/customers.json (loop simple).
- Un test de la regla de familia complementaria/propia: por ejemplo para la-esquina (compra Pepsi/7up/Oreo) esperar que el cross-sell traiga algo de snacks (complementaria) — y si implemento la ampliación del punto 1, también algo de gaseosas (Coca, que no compra).
- Caso límite: cliente cuyo historial cubre todas las familias/complementos posibles (no existe en los datos actuales, lo dejaría como test opcional solo si el fallback del punto 3 se implementa).

---
6. Archivos a modificar

Solo uno debería alcanzar:

- src/recommend.ts — toda la lógica nueva ahí (puede tener funciones internas privadas: estaVencido, productosPorVolumen, candidatosCrossSell, comboEntrada).
- test/recommend.test.ts — agregar los casos del punto 5 (no tocar los existentes).

No debería necesitar tocar types.ts, data.ts, pitch.ts ni server.ts — la consigna y los tipos ya alcanzan para esto.

---
Resumen de la decisión pendiente de tu lado: ¿cerramos cross-sell solo por complementos (tu propuesta original) o lo ampliamos para incluir también "misma familia, otro producto no comprado" (ejemplo Coca/Sprite del README)? Es el único punto donde tu plan y el enunciado no coinciden 1:1; el resto lo veo alineado y listo para implementar.

### Decisión tomada

 Gracias.

  Vamos ampliar lo de cross-sell como indicas, para incluir tambien de la misma familia.
  Me parece bien contemplar la opcion de fallback de relleno.
  Si hay empate en volumen (dos SKUs con misma cajas totales) tomar el primero de momento.
  En cuanto a los test dejemos solo los que estan ahora en el test. Me alcanza con tu recomendacion del punto 5 para mas adelante.

  Empecemos con la implementacion del archivo src/recommend.ts

---

### Resultado

 Bash(npx tsx -e '
  import { recommend } from "./src/recommend.ts";
  import { customers } from "./src/data.ts";
  for (const c of customers) {
    console.log("---", c.nombre);
    for (const o of recommend(c)) console.log(o.motivo, "->", o.product.id);
  }
  ')
npm warn Unknown global config "python". This will stop working in the next major version of npm.
--- Almacén Don José
reposicion -> coca-225
reposicion -> quilmes-1l
cross-sell -> lays-clasicas
--- Kiosco La Esquina
reposicion -> pepsi-225
reposicion -> oreo-118
cross-sell -> coca-225
--- Supermercado Norte
reposicion -> coca-225
reposicion -> lays-clasicas
cross-sell -> quilmes-1l
--- Distribuidora El Recién Llegado
entrada -> coca-225
entrada -> lays-clasicas
entrada -> brahma-1l

Funciona como esperábamos: reposición prioriza los productos de mayor volumen histórico, cross-sell ahora sí captura el caso "misma familia" (ej. la-esquina no compra Coca y se la ofrece) además de familias complementarias, y el cliente sin historial recibe un combo diversificado (gaseosas + snacks + cervezas) por bestsellers globales.

Archivo modificado: src/recommend.ts (único cambio). Tests existentes en verde, sin tocar test/recommend.test.ts como pediste.

---
