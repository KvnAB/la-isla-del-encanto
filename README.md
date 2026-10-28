# La Isla del Encanto

Juego survival 2D top-down en una isla (nombre interno del proyecto: Draycol Survival), jugable en navegador de escritorio. Fase 1: un jugador, tabla de récords compartida entre todos los jugadores.

- Reglas del juego: [`docs/plan_juego_survival_2d.md`](docs/plan_juego_survival_2d.md)
- Diseño técnico: [`docs/superpowers/specs/2026-10-20-draycol-survival-design.md`](docs/superpowers/specs/2026-10-20-draycol-survival-design.md)
- Referencias visuales (estilo plano tipo starve.io y portada): `docs/design/reference/`. Todo el arte del juego se dibuja en código (vectores PixiJS) en `packages/client/src/render/sprites/`; no hay PNG de sprites. `tools/extract-sprites.py` es un resto de una iteración anterior y el juego no lo usa.

## Controles

| Tecla | Acción |
|---|---|
| `WASD` / flechas | moverse |
| ratón | apuntar |
| clic izquierdo | golpear, o usar el objeto seleccionado (comer, colocar fogata, ponerse/quitarse el abrigo, llenar/beber la cantimplora, lanzar la caña al agua) |
| `1`–`9`, `0`, `-`, `=` o rueda | elegir uno de los 12 slots |
| `Q` | tirar el slot seleccionado |
| `M` | silenciar o activar el sonido |

La isla es siempre la misma (semilla fija `island.seed` en la configuración), así todos los jugadores aprenden el mismo mapa y en fase 2 compartirán la misma isla. El tercio norte es **nieve**: allí el frío baja el doble de día y el triple de noche, viven osos polares, pingüinos y lobos, y están las rocas de diamante (solo se pican con pico de oro o mejor). El minimapa de arriba a la derecha muestra la silueta de la isla, la nieve, los árboles, arbustos, rocas, oro y diamante, y dónde estás; no muestra animales.

De noche la isla se oscurece de verdad: ves un círculo pequeño alrededor de ti, más grande y cálido si llevas una antorcha en el inventario, y las fogatas iluminan a su alrededor. A partir de la segunda noche aparece una manada de lobos cerca de ti que desaparece al amanecer.

## Requisitos

- Node.js 24 o superior (usa `node:sqlite`, incluido en Node, sin compilar nada nativo).
- pnpm 10 (`corepack enable` lo activa).

## Arranque rápido

```bash
pnpm install
pnpm build
pnpm start
```

El juego queda en <http://localhost:3000>. El servidor sirve el cliente compilado y la API en el mismo puerto.

## Desarrollo

```bash
pnpm dev
```

Levanta el cliente con recarga en caliente en <http://localhost:5173> (con proxy de `/api` al puerto 3000), el servidor con `tsx watch` en el 3000 y el núcleo en modo `tsc --watch`.

En desarrollo la tecla `H` muestra los círculos de colisión (rojo recursos, naranja criaturas, azul jugador; el anillo tenue es el radio dibujado) y `window.__dbg` da acceso a la partida. Los factores de colisión están en `resources.collision` y `resources.brokenCollision` de la configuración; los radios de luz nocturna en `lights`; los empujones de combate en `combat`.

Otros comandos:

| Comando | Qué hace |
|---|---|
| `pnpm test` | Tests de los tres paquetes (Vitest) |
| `pnpm typecheck` | Comprobación de tipos de los tres paquetes |
| `pnpm --filter @draycol/core test` | Solo los tests del núcleo |

## Variables de entorno

| Variable | Paquete | Por defecto | Uso |
|---|---|---|---|
| `PORT` | server | `3000` | Puerto HTTP |
| `DB_PATH` | server | `./data/scores.db` | Archivo SQLite de récords (se crea solo) |
| `STATIC_DIR` | server | `packages/client/dist` | Carpeta del cliente compilado |
| `VITE_API_BASE` | client (en build) | vacío (mismo origen) | URL base de la API; necesaria solo si el cliente se sirve desde otro origen (p. ej. empaquetado de escritorio) |

## Estructura

```
packages/
  core/     simulación pura (sin navegador): mapa, entidades, reglas, puntos. Corre en Node y en el navegador.
  client/   render (PixiJS 8), entrada, HUD y pantallas (Vite + TypeScript).
  server/   API de récords (Fastify + node:sqlite) y servidor estático.
docs/       reglas, diseño, maqueta visual, capturas de progreso.
```

### Arquitectura en una frase

El núcleo recibe **comandos** (`move`, `aim`, `hit`, `selectSlot`, `useSlot`, `dropSlot`, `craft`), avanza con `step()` a paso fijo (30 Hz), expone un `WorldState` serializable y emite **eventos** (`resourceHit`, `creatureDied`, `crafted`, `playerDied`, …). El cliente solo traduce teclado y ratón a comandos y dibuja el estado. En fase 2 (multijugador) ese mismo núcleo correrá en el servidor y los clientes enviarán sus comandos por WebSocket.

## Dónde cambiar el balance

Todos los números del juego están en **`packages/core/src/config.ts`** (`DEFAULT_CONFIG`): duración del día, tiempos de las barras, capacidades y regeneración de recursos, recetas, criaturas, daños, puntos, tamaño de isla, máximo de criaturas, etc. Los valores marcados con `(*)` son decisiones de implementación dentro de lo que permite el plan de reglas.

## Cómo añadir cosas

**Un objeto nuevo**
1. Añadir el id a `ItemId` en `packages/core/src/types.ts`.
2. Añadir su entrada en `ITEM_META` (`packages/core/src/config.ts`): apilable, si es herramienta/arma/comida/colocable.
3. Nombre en español en `packages/client/src/ui/names.ts` (`ITEM_NAMES`).
4. Su dibujo en `drawItem` (`packages/client/src/render/sprites/vector-items.ts`); el icono del HUD y el objeto en el suelo salen de ahí.
5. Si es comida, su efecto en `config.food`. Si es una herramienta, su rendimiento en `woodPerHit` / `stonePerHit` / `goldPerHit` / `diamondPerHit` (`ToolClass` en `types.ts`). Si es un arma, su daño en `weaponDamage` (`WeaponClass` en `types.ts`); el jugador la muestra en la mano automáticamente. Si se lleva en la mano sin ser herramienta ni arma (antorcha, caña), `held: true`; si el clic lo usa en vez de golpear (cantimplora, caña), `usable: true` y su rama en `useSelectedSlot` (`systems/consume.ts`). Si se cocina en la fogata, su par crudo → cocinado en `campfire.cooks`.

**Un recurso nuevo** (como la roca de oro): id en `ResourceKind`, radio, cantidad y colisión en `config.resources` (y, si solo sale en un bioma o siempre del mismo tamaño, `resources.biome` / `resources.fixedSize`), qué da y con qué herramienta en `yieldFor` (`systems/resources.ts`) y su dibujo en `makeResourceVector` (`vector-resources.ts`, que recibe `snowy` si está sobre nieve) más su marcador en `ui/minimap.ts`.

**Casillas del inventario**: se empieza con `player.inventorySlots` (12) y cada `slotReward.killsPerSlot` (3) pingüinos matados dan una más hasta `slotReward.maxSlots` (20). El HUD crea todas las posibles y oculta las que faltan; las 13–20 no tienen tecla (rueda o clic).

**Una receta nueva**: añadir una entrada en `config.recipes` (coste, `consumes`/`replaces` si sustituye a otra herramienta, `unique` si solo se puede tener una, puntos). El botón de fabricar aparece solo.

**Una criatura nueva**
1. Añadir el id a `CreatureKind` en `types.ts`.
2. Su definición en `config.creatures.defs` (vida, velocidad, radio, daño, radios de detección/huida, botín, puntos, agresiva o no, cantidad inicial; opcionalmente `biome` para que solo aparezca en hierba o nieve, `packSize` para que aparezca en grupo y `nightRaid` para que una manada aparezca junto al jugador al caer la noche). En el botín, `max` sortea la cantidad entre `count` y `max` (el esqueleto suelta 1–2 huesos). `tameWith` la hace domable con ese objeto (el puma con el hueso).
3. Su dibujo en `packages/client/src/render/sprites/vector-creatures.ts` y el caso en `makeCreatureVector`; su nombre en `CREATURE_NAMES` (`ui/names.ts`) para la pantalla de muerte.
Si necesita un comportamiento que no sea deambular/perseguir/atacar/huir, ampliar la máquina de estados de `packages/core/src/systems/creatures.ts`. Las criaturas domadas (`owner` ≠ null) van por `stepPet`: siguen al dueño (`follow`) y cazan (`hunt`) a cualquier criatura agresiva a menos de `taming.guardRadius` del dueño; las salvajes persiguen y muerden tanto a jugadores como a criaturas domadas. Al domar, `makeCreatureVector(kind, r, tamed)` rehace el dibujo (collar).

## Despliegue con Docker

```bash
docker compose up -d --build
```

Expone el puerto 3000 y guarda la base de datos en el volumen `scores-data`. Sin Docker, basta un proceso Node con `pnpm build && pnpm start` (o `node packages/server/dist/index.js`) detrás de cualquier proxy.

> Estado: el `Dockerfile` se escribió siguiendo el flujo `pnpm deploy`; en la máquina de desarrollo el daemon de Docker no estaba disponible el 2026-10-20, así que la imagen aún no se ha construido. El arranque con Node (`pnpm build && pnpm start`) sí está verificado.

## Riesgos conocidos

- **Récords sin validación anti-trampa.** En fase 1 la simulación corre en el navegador y el cliente envía el puntaje; el servidor solo valida formato y rangos. Desaparece en fase 2 al mover el núcleo al servidor.
- Solo escritorio: sin controles táctiles.

## Hoja de ruta (fase 2)

- Multijugador en la misma isla: el núcleo en el servidor como autoridad, comandos por WebSocket, snapshots a los clientes. El núcleo ya maneja varios jugadores (`playerId` en todos los comandos y eventos) y es determinista por semilla.
- Cuentas de usuario, empaquetado de escritorio (Electron/Tauri) usando `VITE_API_BASE`.
