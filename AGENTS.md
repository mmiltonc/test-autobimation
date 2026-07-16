# AGENTS.md

## Objetivo

Asistir en la resolución del ejercicio respetando la consigna existente y manteniendo una implementación simple, clara y defendible.

## Forma de trabajo

* Antes de modificar código, inspeccionar el README, los tipos, los datos y los tests.
* Explicar brevemente el plan antes de implementar.
* Identificar supuestos o ambigüedades de negocio.
* No inventar requisitos que no estén presentes en la consigna.
* Priorizar una solución funcional y comprensible sobre una arquitectura compleja.
* Mantener los cambios acotados al alcance del ejercicio.
* No modificar interfaces públicas sin explicar el motivo.
* Evitar dependencias nuevas salvo que sean estrictamente necesarias.
* No realizar refactors que no aporten a la solución.

## Calidad

* Usar TypeScript respetando los tipos existentes.
* Evitar duplicación innecesaria.
* Usar nombres que expresen la intención de negocio.
* Mantener las funciones pequeñas cuando mejore la legibilidad.
* Evitar valores mágicos cuando representen una regla relevante.
* Revisar que una misma oferta no se devuelva duplicada.

## Verificación

* Ejecutar `npm test` después de modificar el código.
* Revisar los casos existentes antes de agregar nuevos tests.
* Agregar tests solamente para reglas relevantes o casos límite razonables.
* Informar cualquier test fallido y su posible causa.
* Resumir al finalizar qué archivos fueron modificados y qué decisiones se tomaron.

## Restricciones

* No conectar un LLM real salvo que la funcionalidad principal esté completa y verificada.
* No exponer credenciales ni agregar secretos al repositorio.
* No hacer commits automáticamente.
