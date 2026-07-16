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

## 2. Modficacion en logica Upsell

Necesito modificar/adicionar una regla de negocio para el manejo de los upsellers.

  Quiero que el upsell para un producto se pueda medir de la siguiente manera:
  -Evaluar el historial del cliente
  -Tomar los casos donde se repita un producto(SKU)
  -Evaluar las cantidades de cajas solicitadas en cada ocasion
  -Si el cliente fue aumentando la cantidad de cajas, por ejemplo de 3 a 6, ofrecer como upsell la misma diferencia hacia arriba. Que el proximo pedido sea de 9 cajas.
  -En el caso de que la cantidad disminuya, volver a ofrecer la cantidad que solicito anteriormente que fue mayor.

  Evalua esta solucion y decime si es viable o tiene algun inconveniente para su implementacion.

  ### Resultado

  Evaluación de la regla de upsell

La idea es viable y simple de calcular, pero hay 4 puntos que conviene resolver antes de tocar código — dos son detalles técnicos que puedo asumir con un criterio razonable, y dos son decisiones de negocio que prefiero confirmar con vos.

Lo que funciona bien tal cual lo planteaste:
- Detectar SKUs repetidos en el historial, comparar cantidades, sugerir última + diferencia si viene subiendo, o la cantidad mayor anterior si bajó — es una regla puramente aritmética, sin dependencias nuevas.
- Con los datos actuales, solo don-jose tiene un SKU comprado 2+ veces (coca-225: 8→10 cajas, quilmes-1l: 5→6 cajas) — ambos casos "creciente", ambos elegibles a upsell. la-esquina y super-norte no tienen ningún SKU repetido en su historial, así que con esta muestra de datos nunca van a disparar upsell (no es un problema de la regla, es la data).

Detalles técnicos que voy a resolver por mi cuenta (no requieren tu input):
- El historial en el JSON no está garantizado en orden cronológico (de hecho el de don-jose está al revés: primero aparece 06-12, después 06-05). Voy a ordenar por fecha antes de comparar.
- El upsell/reposición debería seguir gateado por estaVencido(), igual que ahora, para mantener consistencia con el resto de la lógica.

## 3. Ampliacion en logica Upsell

 En el caso que la evaluacion sea para mas de 3 productos del mismo SKU, realizar la siguiente evaluacion:
  Si el pedido va en aumento, seguir ofreciendo la ultima + diferencia,
  -Si el producto  fue en ascenso, pero luego en disminuyo, ofrecer el mayor mas proximo a ese ultimo valor.

 ### Resultado

 Entendido. Con eso la regla para 3+ compras del mismo SKU queda así (comparando siempre la penúltima vs la última cronológicamente):

- Si la última ≥ penúltima (sigue en ascenso): ofrezco última + (última − penúltima).
- Si la última < penúltima (bajó): busco entre todo el historial de ese SKU los valores mayores a la última compra, y ofrezco el más cercano por arriba (no el máximo histórico, el "escalón" más próximo). Ej: 3→6→9→5: valores mayores a 5 son {6, 9}, ofrezco 6.

¿Es correcta esta lectura?

Dos cosas que todavía me faltan para poder implementar:

1. Caso empate (última == penúltima, ej. 5 y 5): ¿lo tratamos como upsell (no hay señal, cae a reposición normal) o como upsell mínimo (+1 caja)?
2. Dónde va la cantidad sugerida en el mensaje. generatePitch(product, customer, motivo) no recibe cantidad, y Offer tampoco tiene un campo para "cantidad sugerida" — hoy el mock ni siquiera podría mencionar "12 cajas" en el texto. Para que el upsell diga algo útil (no solo "sumá X" genérico) necesito agregar un parámetro opcional a generatePitch y un campo opcional al tipo Offer (cambio aditivo, no rompe nada existente). ¿Confirmás que puedo tocar esas dos interfaces para esto?

### Decisión tomada

En caso de empate como upsell minimo y toquemos el generatePitch para mostrar la cantidad recomendada.

## 4. Mejora en performance

Revisa la implementacion actual, especialmente src/data.ts y src/recommend.ts.

Quiero evaluar una mejora de rendimiento sin cambiar la logica de recomendaciones ni rediseñar el proyecto.

Las dos ideas son:
Reemplazar la busqueda actual de productos con products.find() por un Map de productos indexados por ID, construido una sola vez al cargar los datos.
Ordenar los productos por ventas globales una sola vez y reutilizar ese ranking, en lugar de volver a ejecutar .sort() dentro de cada recomendacion.

Por ahora no modifiques archivos.Primero analiza:

En que lugares concretos se repiten busquedas u ordenamientos.
Que mejora real aportarian estos cambios con muchos productos o muchas solicitudes.
Si introducen algún riesgo, cambio de comportamiento o dificultad adicional.
Si son mejoras razonables para el alcance de este ejercicio o si serian optimizaciones sin sentido.
Que archivos seria necesario cambiar.

### Resultado

Confirma el análisis. Van los cinco puntos.

1. Dónde se repiten

productById (data.ts:15-16) — products.find(), O(n) lineal. Se llama por cada recommend():
- recommend.ts:77 — una vez por SKU único del historial (dentro de candidatosCrossSell).
- recommend.ts:135 — hasta REPOSICION_MAX (2) veces.

Sin caché: O(n) × (SKUs únicos + 2) por request.

Ordenamiento por ventas globales, .sort((a,b) => ventasGlobales(b.id) - ventasGlobales(a.id)) aparece tres veces con el mismo criterio:
- recommend.ts:86 — sobre el subset filtrado de cross-sell.
- recommend.ts:91 — sobre el catálogo completo, en comboEntrada.
- recommend.ts:150 — sobre el catálogo completo otra vez, en el fallback.

Cada llamada a recommend() puede disparar 2 de estos 3 sorts (el de cross-sell siempre; el de comboEntrada o el fallback según el caso).

2. Mejora real con más productos/solicitudes

- Map en productById: pasa de O(n) a O(1). Con 16 productos es irrelevante (nanosegundos); con un catálogo de miles de SKUs y muchas requests/segundo, elimina el factor n por completo. El beneficio escala con el tamaño del catálogo × volumen de tráfico, no con la lógica de negocio.
- Ranking precalculado: evita repetir un O(n log n) en cada recommend(). El ahorro es mayor que el del Map en términos asintóticos (ordenar es más caro que buscar), pero además —y esto es lo más valioso hoy— elimina la duplicación del mismo criterio de sort en 3 lugares, algo que ya pide AGENTS.md independientemente del rendimiento.

3. Riesgos / cambios de comportamiento

- Map: prácticamente sin riesgo. Mismo resultado que .find() siempre que los id sean únicos (lo son en products.json, verificado). Es un cambio interno de data.ts, no toca la firma pública de productById.
- Ranking precalculado: el único cuidado real es no mutar el array cacheado. .sort() de JS muta in-place; si se cachea el array ya ordenado, los tres sitios deben usar .filter() sobre él (nunca volver a .sort()), lo cual además es gratis: .filter() preserva el orden relativo, así que filtrar un array ya ordenado da un subconjunto ya ordenado, sin sort adicional. Esto depende de que products/customers sean estáticos durante la vida del proceso — hoy lo son (se cargan una vez del JSON y nadie los muta), igual que ya asume el código actual con ventasGlobalesPorSku.
- Ninguno de los dos cambia el orden final de las ofertas, el criterio de desempate, ni ningún test existente.

4. ¿Razonables o innecesarias para este ejercicio?

Con 16 productos y 4 clientes, el impacto medible en rendimiento es nulo hoy — honestamente, ninguna aporta algo perceptible a esta escala. Dicho eso:

- El Map lo haría igual: es la forma idiomática de hacer lookup por ID, no agrega complejidad ni dependencias, no cambia comportamiento, y es un cambio de una línea. Se justifica más por corrección/legibilidad que por performance.
- El ranking precalculado lo enmarcaría principalmente como eliminación de duplicación (mismo .sort() repetido 3 veces), con el ahorro de CPU como beneficio secundario que solo importaría si el catálogo o el tráfico crecieran órdenes de magnitud. Como optimización pura a este tamaño sería difícil de defender; como limpieza de código, tiene sentido.

Ninguna de las dos requiere rediseño ni nuevas dependencias — son cambios acotados y en línea con el alcance del ejercicio.

5. Archivos a modificar

- src/data.ts: cambiar la implementación interna de productById para usar un Map construido junto a products (sin tocar su firma pública).
- src/recommend.ts: agregar un array productos ordenados por ventas globales precalculado una sola vez (junto a ventasGlobalesPorSku), y reemplazar los tres .sort() por .filter() sobre ese array en candidatosCrossSell, comboEntrada y el fallback.

No haría falta tocar types.ts, pitch.ts, server.ts ni el test.

¿Avanzamos con los dos cambios?

### Decisión tomada

Si, implementemos solo esos cambios.