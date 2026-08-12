# Desglose por unidades en el análisis IA de comida

**Fecha:** 2026-08-12 · **Estado:** aprobado por diseño (propuesta del usuario, mejorada)

## Problema

El análisis IA devuelve items agregados ("Huevos revueltos — 210 kcal"). Si la IA
contó mal (2 huevos en vez de 3), el único ajuste disponible es un stepper de
±0.25 "porciones" del agregado — el usuario tendría que calcular 3/2 = 1.5
porciones mentalmente. Para alimentos unitarios (huevos, tortillas, tacos,
rebanadas) el ajuste natural es **±1 pieza**.

## Decisión de diseño (enfoques evaluados)

- **A (elegido): unidad como metadato del item.** La IA reporta por item:
  `countable`, `unitCount`, `unitLabel`, `gramsPerUnit`; los macros del item
  siguen siendo TOTALES. El cliente deriva macros por unidad (= total / count).
- B (descartado): pedir a la IA macros por unidad → duplica convenciones y
  rompe el validador de energía existente (que opera sobre totales).
- C (descartado): repetir sub-items ("huevo", "huevo", "huevo") → lista
  inflada, más tokens, peor UX.

## Contrato de datos

### IA → API (`/api/analyze-food`)
Cada `foods[]` agrega:
```json
"countable": true,        // solo piezas contables a simple vista
"unitCount": 3,           // piezas contadas (múltiplos de 0.5)
"unitLabel": "pza",      // sustantivo corto en español: pza/tortilla/rebanada/taco/cda
"gramsPerUnit": 55        // peso por pieza; estimatedGrams = unitCount × gramsPerUnit
```
`calories/protein/carbs/fat/fiber` del item siguen siendo el **total**.

Normalización server-side (`lib/analysis.ts`, pura y testeada):
- clamp/rounding (`unitCount` a múltiplos de 0.5, mínimo 0.5; `gramsPerUnit` entero > 0)
- deriva `gramsPerUnit = estimatedGrams / unitCount` si falta
- degrada a `countable: false` si los datos no cierran
- fuerza `estimatedGrams = unitCount × gramsPerUnit` para coherencia visual

### Mapping al store (log page)
Encaja en el modelo existente `MealFoodEntry` sin migraciones:
- unitario: `food.servingSize = gramsPerUnit`, `food.servingUnit = unitLabel`,
  `food.macros = total / unitCount` (por pieza), `servings = unitCount`,
  totales del entry = totales del item.
- no unitario: como hoy (`servingSize = estimatedGrams`, `servingUnit = "g"`,
  `servings = 1`).

### Persistencia
Sin cambios de schema: `food_entries` ya guarda `servingSize`, `servingUnit`,
`servings` y macros **totales**. En el round-trip, `mapServerMeal` deriva los
macros por porción como `total / servings` (para `servings = 1` es idéntico a
antes → compatible con todos los datos existentes).

## UI (pantalla de revisión del log)

- **Unitario** (`isCountableUnit(servingUnit)`): stepper **±1 pieza**, mínimo 1
  (si la IA reportó 2.5 se conserva el .5 al sumar/restar). Muestra
  `3 pza · ≈55 g c/u · 165 g` y `≈78 kcal/pza` para que el usuario sepa qué
  suma cada +1.
- **No unitario**: stepper en **gramos** con paso adaptativo (±5 g < 50 g,
  ±10 g ≤ 250 g, ±25 g > 250 g), mínimo un paso. Reemplaza el abstracto
  "0.75 porciones".
- **Confianza**: si la IA marcó `confidence: "low"` en un item, se muestra un
  punto ámbar ("verifica la cantidad") — empuja al usuario a corregir el conteo
  justo donde la IA duda.
- `isCountableUnit`: lista negra de unidades de masa/volumen (g, kg, ml, oz…);
  todo lo demás se trata como unitario. Aplica también a plantillas y búsqueda.

## Fuera de alcance

- Editor de comidas ya guardadas (el PUT existe; UI futura).
- Fracciones menores a 0.5 pieza (se cubren con el modo gramos si hace falta).
- Shakes: usa el mismo endpoint pero agrega todo en un solo item; ignora los
  campos nuevos sin cambios.

## Testing

- Unit tests del normalizador (consistencia, derivaciones, degradación).
- Unit tests de `isCountableUnit`.
- Suite completa + typecheck + build antes del push.
