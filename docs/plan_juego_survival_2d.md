# Documento de Diseño: Juego Survival 2D en Isla (Fase 1)

Este documento reúne todas las reglas, mecánicas, objetos, criaturas y valores numéricos definidos para la primera versión jugable del survival 2D, listo para entregarse como guía de desarrollo a Claude.

## 1. La pantalla de inicio registra al jugador, su herramienta inicial y los récords

Antes de entrar a la isla, el jugador pasa por una pantalla principal con tres elementos clave:

* **Registro de identidad:** Un campo para escribir el nombre del jugador antes de iniciar la partida.
* **Elección de equipamiento inicial:** El jugador debe elegir entre entrar a la isla con **1 Pico de madera** o con **1 Espada de madera** en su inventario.
* **Botón de inicio y tabla de récords:** Un botón de **Jugar** para entrar al mapa y una lista visible con los mejores puntajes e historial de días sobrevividos con los nombres de partidas anteriores.

## 2. La isla combina recursos regenerativos, cuerpos de agua y ciclo de día y noche

El mundo es una isla en vista 2D desde arriba (top-down) rodeada por un mar profundo que el jugador no puede cruzar. El tamaño de la isla y la cantidad máxima de criaturas activas deben ser fáciles de ajustar para equilibrar la partida tras las primeras pruebas.

| Elemento del Entorno | Comportamiento y Reglas en Partida |
| :--- | :--- |
| **Árboles maderables** | Dan madera al golpearlos; existen en tamaño pequeño, mediano y grande. |
| **Árboles frutales** | Sueltan manzanas al golpearlos (3 manzanas el pequeño, 4 el mediano y 6 el grande). |
| **Rocas** | Dan piedra únicamente si se golpean con un pico equipado; existen en tres tamaños. |
| **Ríos y lagos** | Rellenan la barra de sed al meterse al agua, reducen la velocidad al nadar y enfrían más rápido al jugador. |
| **Mar exterior** | Funciona como borde físico infranqueable alrededor de toda la isla. |
| **Ciclo Día / Noche** | Dura **8 minutos** en total: **4 minutos de día** (50%) y **4 minutos de noche** (50%) con un filtro visual nocturno en toda la pantalla y descenso más rápido de temperatura. |

### Regeneración progresiva por porcentaje en árboles y rocas

Cuando un árbol o una roca se queda sin recursos, pasa a estado **roto** y comienza a recuperarse gradualmente según el tiempo transcurrido. Si el jugador lo vuelve a golpear antes de que llegue al 100%, el recurso entrega únicamente el porcentaje acumulado hasta ese momento (por ejemplo, si lleva la mitad del tiempo de recuperación, está al 50% y entrega la mitad de su capacidad total).

| Tamaño del Recurso | Capacidad al 100% (Madera o Piedra) | Tiempo de Recuperación al 100% |
| :--- | :--- | :--- |
| **Pequeño** | 20 unidades | 1 minuto (60 segundos) |
| **Mediano** | 50 unidades | 2 minutos (120 segundos) |
| **Grande** | 100 unidades | 3 minutos y medio (210 segundos) |

## 3. Cuatro barras vitales regulan la supervivencia y la regeneración de vida

El jugador cuenta con cuatro barras de estado ubicadas en la parte inferior central de la pantalla: **Vida**, **Hambre**, **Sed** y **Frío (Temperatura)**.

* **Desgaste natural:** Las barras de Hambre, Sed y Frío tardan **4 minutos** en vaciarse por completo en condiciones normales.
* **Factores que aceleran el frío:** Estar dentro de ríos o lagos y transitar durante los 4 minutos de noche hacen que la barra de frío baje más rápido.
* **Regeneración de vida:** El jugador recupera vida de forma pasiva con el paso del tiempo; si sus barras de Hambre, Sed y Frío están en buen nivel, la vida se recupera más rápido. Si alguna de las barras de supervivencia llega a cero, el jugador pierde vida progresivamente.
* **Muerte permanente (Reinicio):** Si la barra de vida llega a cero, el jugador muere, pierde todo su inventario y regresa a la pantalla de inicio para comenzar una nueva partida.

| Alimento o Acción | Efecto en Hambre / Sed | Efecto en Vida | Condición de Uso |
| :--- | :--- | :--- | :--- |
| **Manzana** | +20% de Hambre | Sin efecto directo | Seleccionar slot y hacer clic |
| **Filete crudo** | +15% de Hambre | -10% de Vida | Seleccionar slot y hacer clic |
| **Filete cocinado** | +45% de Hambre | Sin penalización | Cocinar 4 segundos cerca de una fogata |
| **Meterse al río o lago** | Rellena la barra de Sed | Sin efecto directo | Entrar en contacto con el agua |

## 4. El inventario de 8 slots gestiona herramientas, ropa y objetos del suelo

En la parte inferior central de la pantalla (junto a las barras de estado) se muestran los **8 slots de inventario**.

* **Capacidad infinita por tipo:** Cada slot puede acumular una cantidad infinita de unidades siempre que sean exactamente del mismo material u objeto.
* **Ocupación de slots:** Las herramientas/armas equipadas, el abrigo y las fogatas guardadas ocupan cada uno su propio slot dentro de los 8 disponibles.
* **Uso de objetos:** Para atacar, picar, comer o colocar una fogata en el suelo, el jugador selecciona el slot correspondiente y hace clic.
* **Objetos en el suelo (1 minuto):** Si el jugador tira un objeto de su inventario para liberar espacio, o si una criatura suelta botín al morir, el objeto queda en el suelo durante **1 minuto** antes de desaparecer. Para recoger cualquier objeto del suelo basta con darle un toque (golpe/clic).

## 5. Las herramientas y recetas aparecen automáticamente al reunir los materiales

El juego no requiere mesa de crafteo en esta primera etapa. Cuando el jugador reúne en su inventario los materiales necesarios para una receta, el botón de fabricación aparece automáticamente en la **esquina superior izquierda** de la pantalla.

| Objeto a Fabricar | Materiales Requeridos | Reglas Especiales y Funcionamiento |
| :--- | :--- | :--- |
| **Pico de madera** | 10 de madera | Permite picar piedra (1 por golpe) y sacar 2 de madera por golpe. |
| **Espada de madera** | 30 de madera | Arma básica para combatir tigres, ovejas y duendes. |
| **Pico de piedra** | 20 de madera + 20 de piedra + 1 Pico de madera | Reemplaza al pico de madera en su mismo slot; da 3 de madera y 2 de piedra por golpe. |
| **Espada de piedra** | 60 de madera + 30 de piedra + 1 Espada de madera | Reemplaza a la espada de madera en su mismo slot; reduce los golpes para matar enemigos. |
| **Fogata** | 15 de madera + 5 de piedra | Se guarda en un slot; al colocarla en el suelo dura **1 minuto y medio (90 s)**. Pararse cerca quita el frío y cocina cada filete crudo en **4 segundos**. |
| **Abrigo nivel 1** | 5 de lana + 5 de piel de tigre + 1 aguja | Ocupa un slot; hace que la barra de frío baje más lento en la noche y en el agua. |

### Rendimiento de recolección por golpe

| Herramienta Equipada | Madera por Golpe (Árbol) | Piedra por Golpe (Roca) |
| :--- | :--- | :--- |
| **Mano (sin pico)** | 1 de madera | No puede picar piedra (0) |
| **Pico de madera** | 2 de madera | 1 de piedra |
| **Pico de piedra** | 3 de madera | 2 de piedra |

## 6. Tres criaturas con velocidades y comportamientos distintos habitan la isla

Todas las criaturas reaparecen en el mapa **45 segundos** después de morir y sueltan su botín directamente al suelo (donde permanece por 1 minuto hasta que el jugador lo recoja de un golpe).

| Criatura | Comportamiento y Velocidad | Golpes para Matarlo (Puño / Espada Madera / Espada Piedra) | Daño al Jugador | Botín al Morir (cae al suelo) |
| :--- | :--- | :--- | :--- | :--- |
| **Tigre** | Agresivo al acercarse; corre más lento que el jugador. | 30 puños / 15 espadazos madera / 10 espadazos piedra | Mata al jugador de **7 ataques** | 1 Piel de tigre + 1 Filete crudo |
| **Oveja mala** | Agresiva al acercarse (como un lobo); corre más lento que el jugador. | 20 puños / 10 espadazos madera / 7 espadazos piedra | Mata al jugador de **8 ataques** | 2 de Lana |
| **Duende pequeño** | Pacífico (no hace daño); huye y corre **más rápido** que el jugador y los animales. | 8 puños / 4 espadazos madera / 3 espadazos piedra | No ataca (0 daño) | 1 Aguja (para el abrigo nivel 1) |

## 7. El sistema de puntuación premia la recolección, la caza, el crafteo y los días sobrevividos

En la interfaz se muestra en todo momento el contador de **Días sobrevividos** y el total de **Puntos**. Al morir, ambos datos quedan registrados junto al nombre del jugador en la tabla de récords de la pantalla de inicio.

| Acción Realizada por el Jugador | Puntos Otorgados |
| :--- | :--- |
| **Recolectar 1 unidad de madera, manzana o piedra** | +1 punto por unidad |
| **Cocinar 1 filete de carne en la fogata** | +10 puntos |
| **Fabricar pico de madera, espada de madera o fogata** | +25 puntos |
| **Derrotar a una oveja mala** | +40 puntos |
| **Derrotar al duende pequeño** | +60 puntos |
| **Derrotar a un tigre** | +80 puntos |
| **Fabricar pico de piedra, espada de piedra o abrigo nivel 1** | +100 puntos |
| **Sobrevivir un día completo (cada ciclo de 8 minutos)** | +250 puntos |
