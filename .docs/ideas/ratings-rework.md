# Especificación Técnica: Refactor del Sistema de Calificaciones y Ranking

## Cómo usar este documento

`ideas/` no es backlog aprobado. Este archivo funciona como material de
entrada para decisiones de producto y diseño técnico.

Estado actual:

- la parte de tracking/rating/favorite se absorbe en `Sprint 11`;
- la parte de ranking/leaderboards se absorbe en `Sprint 15`.

Si esas decisiones quedan cerradas en los sprint docs y en los
documentos canónicos, este archivo debería reducirse o retirarse para
evitar narrativas paralelas.

## Roadmap Placement

Esta idea queda absorbida parcialmente por `Sprint 11` y `Sprint 15`.
`Sprint 11` debe cerrar la separación entre `rating`, `favorite` y
tracking personal, además de decidir si el MVP adopta precisión de 0.1.
El ranking bayesiano, `ranking_score` desnormalizado y cualquier boost
por favoritos pertenece a leaderboards/rankings, no al primer corte de
tracking.

## 1. Contexto y Objetivos
Se requiere refactorizar el sistema de calificación y ordenamiento de elementos (música, películas, juegos) en la aplicación. El objetivo es pasar de una escala de 0.5 (0 a 10) a una escala decimal de 0.1, separar la evaluación objetiva (nota) del disfrute personal (favorito), e implementar un sistema de ranking robusto que evite el sesgo de elementos con pocas calificaciones.

## 2. Modelo de Datos y Base de Datos
* **Migración de Escala:** La escala pasará a tener 101 valores posibles (0.0 a 10.0).
* **Almacenamiento (Base de Datos):** Para evitar problemas de precisión con coma flotante, la nota exacta ingresada por el usuario se debe multiplicar por 10 y almacenarse como un número entero (`INT` o `SMALLINT`). Ejemplo: `8.5` se almacena como `85`.
* **Estrategia de Migración:** Multiplicar todos los registros actuales de calificaciones (ej. `8.5`) por 10 para estandarizar la base de datos a la nueva estructura.
* **Nuevos Campos Requeridos:**
    * `is_favorite` (Boolean): Flag independiente para que el usuario marque obras maestras o favoritos absolutos, separando la calidad pura del gusto personal.
    * `ranking_score` (Float/Decimal): Columna pre-calculada y desnormalizada utilizada exclusivamente para el `ORDER BY` en los endpoints de listados y rankings.

## 3. Lógica de Negocio y Algoritmo de Ranking (Backend)
El ordenamiento principal de la plataforma ya no dependerá del promedio simple, sino de un cálculo que pondere el volumen de votos y el ratio de favoritos.

* **Promedio Bayesiano:** Implementar la fórmula para normalizar las calificaciones frente al volumen de votos.
    * `ScoreBayesiano = ((W * R) + (V * C)) / (W + V)`
    * `W`: Peso de confianza / Votos fantasma (Constante predefinida, ej. 50).
    * `R`: Promedio global histórico de toda la base de datos de "den".
    * `V`: Cantidad de votos reales que tiene el elemento.
    * `C`: Promedio simple de calificación del elemento.
* **Factor de Favoritos (Boost):** Aplicar un multiplicador o suma ponderada al `ScoreBayesiano` basado en la proporción de favoritos (`total_favoritos / V`).
* **Arquitectura de Actualización:** El `ranking_score` **NO** debe calcularse al vuelo en las consultas de lectura (`GET`). Debe actualizarse de manera asíncrona (mediante workers, eventos de dominio o colas de mensajes) cada vez que se registre o modifique un voto o estado de `is_favorite`.

## 4. Interfaz de Usuario y Experiencia (Frontend)
* **Validación de Payload:** Asegurar que los DTOs rechacen cualquier valor que no esté en el rango `0 <= rating <= 100` (valor ya normalizado a entero).
* **Visualización de Nota:** * Forzar siempre la visualización del decimal `.0` para mantener alineación en UI (mostrar `9.0` en vez de `9`).
    * Implementar un sistema sutil de color coding (gradientes o colores base) para que la distribución de la nota se entienda visualmente antes de leer el número.
* **Visualización de Favoritos:** Incorporar un botón rápido de "Corazón/Estrella" en la interfaz de calificación. En los listados, los elementos con `is_favorite = true` deben destacar visualmente (ej. un borde, un ícono o brillo en la carátula) independientemente de su nota numérica. En las listas de ranking global, se mostrará visualmente el "Promedio Simple", pero el orden de renderizado respetará el `ranking_score` del backend.
