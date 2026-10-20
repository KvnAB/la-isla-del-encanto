# Draycol Survival

Juego survival 2D top-down en una isla, jugable en navegador de escritorio. Fase 1: un jugador, tabla de récords compartida entre todos los jugadores.

- Reglas del juego: [`docs/plan_juego_survival_2d.md`](docs/plan_juego_survival_2d.md)
- Diseño técnico: [`docs/superpowers/specs/2026-10-20-draycol-survival-design.md`](docs/superpowers/specs/2026-10-20-draycol-survival-design.md)
- Dirección visual aprobada: [`docs/design/maqueta-estilo-visual-aprobada.html`](docs/design/maqueta-estilo-visual-aprobada.html)

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
4. Icono vectorial en `packages/client/src/render/sprites/items.ts` (`makeGroundItem`).
5. Si es comida, su efecto en `config.food`.

**Una receta nueva**: añadir una entrada en `config.recipes` (coste, `consumes`/`replaces` si sustituye a otra herramienta, `unique` si solo se puede tener una, puntos). El botón de fabricar aparece solo.

**Una criatura nueva**
1. Añadir el id a `CreatureKind` en `types.ts`.
2. Su definición en `config.creatures.defs` (vida, velocidad, radio, daño, radios de detección/huida, botín, puntos, agresiva o no, cantidad inicial).
3. Su dibujo en `packages/client/src/render/sprites/creatures.ts` (`makeCreature`).
Si necesita un comportamiento que no sea deambular/perseguir/atacar/huir, ampliar la máquina de estados de `packages/core/src/systems/creatures.ts`.

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
- Isla compartida o diaria (semilla servida por la API).
- Cuentas de usuario, sonido, empaquetado de escritorio (Electron/Tauri) usando `VITE_API_BASE`.
