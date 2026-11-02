# Naíto virtual — demo de la presentación 🍺🤖

Como el robot NAO se dañó, esta es la demo: un **robot caricaturesco estilo NAO** en un **bar de dibujos animados**.
En el televisor del bar se ve la webcam con las cajas de YOLO, y Naíto **señala con el brazo** la cerveza que más le
gusta de las que ve, según una lista de gustos que se puede reordenar arrastrando.

---

## 1. Qué se necesita

- **Windows 10 u 11**, con **webcam**.
- **Chrome o Edge**. Para la cámara, el navegador tiene que permitirla.
- **Python 3.10 o superior**. Recomendado 3.12, aunque también se probó con 3.14. Se descarga de
  <https://www.python.org/downloads/>: al instalarlo, **marcar la casilla "Add python.exe to PATH"**.
- **Internet solo la primera vez**, para instalar las librerías. Después funciona sin internet.
- **GPU no es necesaria.** El modelo nano corre bien en CPU (unos 25–30 ms por frame de 720p en el PC donde se
  entrenó, según `extras_v5/RESULTADOS_v5.md`).

## 2. Estructura de carpetas (importante)

Las carpetas **`presentacion/`** y **`modelos/`** tienen que estar **una al lado de la otra**, dentro de una misma
carpeta (el nombre de esa carpeta no importa):

```
CualquierNombre/
├── modelos/                        ← los .pt van DIRECTAMENTE aquí (sin subcarpetas)
│   ├── cervezas_small_v6.pt        ← la demo arranca con este; si no está, con el primero de la lista
│   ├── cervezas_small_v5.pt
│   └── ... (cervezas_nano_v1/v4, cervezas_small_v1/v4)
└── presentacion/
    ├── iniciar.bat                 ← DOBLE CLIC AQUÍ
    ├── servidor.py                 ← servidor local: carga el .pt y corre YOLO
    ├── requirements.txt            ← librerías: ultralytics, opencv-python, lap
    ├── LEEME.md                    ← este archivo
    └── web/
        ├── index.html              ← la página (entrada vaquera, bar, robot, televisor, panel)
        ├── estilos.css
        └── app.js                  ← la lógica: cámara, cajas, gustos, robot
```

- Los `.pt` **no se descomprimen**: por dentro son un zip, pero se usan tal cual.
- No hace falta tener todos los `.pt`. Con `cervezas_small_v6.pt` basta.
- La primera vez, `iniciar.bat` crea una carpeta `presentacion/.venv/` con Python y las librerías. **No hay que
  enviarla** a otro computador: cada PC crea la suya.

**Para pasársela a un compañero:** enviar `presentacion/` (sin `.venv` si existe) y `modelos/` con los `.pt` (unos
5 MB cada nano y 20 MB cada small). Por ejemplo, comprimiendo las dos carpetas en un `.zip`.

## 3. Primera vez (instalación)

**Opción A, automática:** doble clic en **`presentacion/iniciar.bat`**.

- Si no encuentra un entorno de Python, crea `.venv` e instala todo solo. Puede tardar **varios minutos**, porque
  descarga PyTorch.
- Cuando termina, arranca la demo directamente.

**Opción B, a mano** (si la A falla, o para ver bien los errores). En PowerShell, dentro de `presentacion/`:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python servidor.py
```

> **Opcional, GPU NVIDIA:** con pip, PyTorch se instala sin CUDA (CPU). Para usar la GPU, instalar antes PyTorch con
> CUDA desde <https://pytorch.org> (Windows, Pip, CUDA). El servidor usa la GPU solo si
> `torch.cuda.is_available()` es `True`, y en la consola dice `Dispositivo: GPU (...)` o `CPU`.

## 4. Cada vez que se use

1. Doble clic en **`iniciar.bat`**.
2. Se abre una **ventana negra (consola)**, que es el servidor. Cuando dice `Naíto está listo en http://localhost:8000`,
   se abre solo el navegador. Si no se abre, entrar a mano a <http://localhost:8000>.
3. La página abre **afuera del bar**: una fachada vaquera de noche, con Naíto asomado por encima de las puertas.
   Abajo dice `✓ Servidor listo · cervezas_small_v6` cuando el modelo ya cargó.
4. Presionar **"Entrar al Bar Naíto"** (o la tecla **Enter**). Suena una campanita, se abren las puertas vaqueras,
   la cámara se acerca hasta Naíto y ahí arrancan la webcam y el modelo.
5. **Permitir la cámara** cuando el navegador lo pregunte.
6. **No cerrar la consola** mientras se usa la demo: es el servidor que corre YOLO.
7. Para terminar: cerrar el navegador y la consola (o `Ctrl+C` en la consola). Para volver a ver la entrada,
   recargar la página (F5).

> **¿Por qué el botón no arranca el servidor?** Por seguridad, una página web no puede ejecutar programas del
> computador. Por eso el servidor lo arranca `iniciar.bat`, que también abre la página. El botón arranca todo lo
> demás: la cámara, el modelo y el robot. Además, el modelo se precarga mientras la página está en la puerta,
> así que al entrar normalmente ya está listo.

Si el puerto 8000 está ocupado, se puede abrir en otro desde PowerShell, dentro de `presentacion/`:

```powershell
.\iniciar.bat --puerto 8080
```

Para la presentación: tecla **F** (pantalla completa) **antes** de entrar, para que la animación se vea en grande. Después de entrar, el panel queda oculto: se abre con ⚙ o la tecla **P**.

## 5. Cómo se usa

### Panel (botón ⚙ arriba a la derecha, o tecla P)

| Opción | Qué hace |
|---|---|
| **Modelo (.pt)** | Cualquier `.pt` de `modelos/`. Avisa si no tiene nuestras 6 marcas (por ejemplo, si es el `yolo26n.pt` base de COCO). |
| **Cámara** | Elegir otra webcam si hay varias. |
| **Umbral de confianza** | Por defecto 0.53 (umbral F1 del small v6), ajustable de a 0.01. Los umbrales F1 de v4 y v5 están en `extras_v5/RESULTADOS_v5.md`; los de v6, en `NotebooksEjecutados/02_ejecutado_v6.ipynb`. |
| **Gustos** | **Arrastrar las cajitas** (en el panel o directamente en la pizarra del bar), o usar ▲▼, "Al azar" y "Restablecer". 1 = le encanta, 6 = nada. Se guarda en el navegador. |
| **Mostrar todas las cajas** | Si se apaga, solo se ve la caja de la lata elegida. |
| **Espejo** | Solo voltea lo que se **ve**. Al modelo le llega la imagen sin voltear, porque los logos no se voltean (`fliplr=0`). |
| **Voz de Naíto** | Dice la frase en voz alta con la voz en español de Windows. |
| **Tracking** | ByteTrack con IDs, **encendido por defecto** en esta demo (ver sección 6). |

**Teclas:** **P** panel · **F** pantalla completa · **V** voz · **M** espejo.

### Qué hace el robot

| Lo que ve | Ojos / LEDs | Qué hace |
|---|---|---|
| Su favorita (puesto 1) | corazones rosados | saluda con el otro brazo y salta |
| Puestos 2 y 3 | verdes | contento, la señala |
| Puestos 4 y 5 | amarillos | "meh", la señala |
| Puesto 6 | azules, ojos caídos | triste, la señala de mala gana |
| Ninguna cerveza | cian | mira a los lados buscando |

- El **bocadillo** muestra lo que dice y qué marcas ve.
- La **pizarra** de la barra ilumina las marcas que se ven y pone una ★ en la elegida.
- En el **televisor**, cada caja dice su ID de tracking, la marca, la confianza y su puesto en los gustos. La
  elegida va en dorado.
- El **HUD** del televisor muestra el modelo, los FPS de detección y los ms de inferencia: sirve para comparar nano
  y small en el portátil de la presentación.

## 6. Cómo funciona por dentro

```
Navegador (webcam 1280x720, 30 fps)  ──frame JPEG──▶  servidor.py  (YOLO con el .pt elegido)
          ▲                                                  │
          └────────────── cajas + IDs en JSON ◀──────────────┘
Navegador: dibuja las cajas, escoge la favorita y mueve al robot
```

- **`servidor.py`** usa solo la librería estándar de Python, más `ultralytics`, `opencv` y `lap`. Lista los `.pt`
  de `modelos/`, carga el elegido y corre YOLO en cada frame, con `imgsz=640` como en el entrenamiento. Solo escucha
  en `localhost`: nadie más en la red puede entrar.
- **`web/`** contiene la página. Todo está dibujado en SVG, **sin imágenes ni librerías de internet**.
- **Cómo escoge:** de las latas que se ven, señala la que está más arriba en la lista de gustos.
- **Tracking:** el `.pt` detecta **cada frame por separado**, sin memoria. **ByteTrack**, un algoritmo de
  Ultralytics que **no se entrena**, une las cajas entre frames:
  1. predice hacia dónde se mueve cada lata;
  2. empareja las cajas nuevas con esas predicciones por IoU;
  3. le da a cada lata un **ID**.

  Con eso, en `app.js`:
  - la marca de cada ID se decide por **votación** entre sus frames (un frame suelto que dice "póker" sobre una
    Águila no cambia nada);
  - el robot se queda con **su lata** (su ID) mientras siga en cámara y no aparezca una que le guste más;
  - solo habla cuando cambia la **marca** elegida, y no repite la misma frase en voz alta antes de 8 s.

  Sin tracking funciona igual, pero agrupando por marca en vez de por ID.

## 7. Problemas comunes

| Problema | Solución |
|---|---|
| "⚠ No encuentro el servidor" (en la puerta), "no hay conexión con servidor.py" o "Failed to fetch" | Se cerró la consola. Volver a abrir `iniciar.bat` y recargar la página (F5). |
| "No se pudo abrir la cámara" | Permitir la cámara en el navegador (icono de candado o cámara en la barra de direcciones). Cerrar otros programas que la usen: Teams, Zoom, la app Cámara, `probar_modelo.py`. Elegir otra en el panel si hay varias. |
| La lista de modelos sale vacía | Los `.pt` no están en `modelos/` al lado de `presentacion/` (ver sección 2). |
| "⚠ Este modelo NO tiene nuestras 6 marcas" | Se eligió un `.pt` que no es de cervezas (por ejemplo, el base de COCO). Elegir un `cervezas_*.pt`. |
| `python no se reconoce` o se abre la Microsoft Store | Instalar Python desde python.org marcando "Add python.exe to PATH". Si sigue, en Windows: *Configuración → Aplicaciones → Configuración avanzada de aplicaciones → Alias de ejecución de aplicaciones* y apagar los de `python.exe`. |
| La instalación falla a mitad | Revisar el internet y volver a abrir `iniciar.bat`: reintenta instalar lo que falte. Si sigue, borrar la carpeta `presentacion/.venv` y probar la opción B. |
| Va lento (pocos FPS) | Usar el **nano**, cerrar otros programas y conectar el portátil a la corriente. Con GPU NVIDIA, ver la nota de la sección 3. |
| El robot pierde la lata cuando se tapa con la mano | Probar bajando el umbral de confianza (por ejemplo, a 0.30), para que al tracker le lleguen también las cajas de confianza baja. *Por verificar con la webcam.* |
| No suena la voz | Activar "Voz de Naíto" (tecla V) y subir el volumen. Edge suele traer más voces en español que Chrome. |
| Puerto 8000 ocupado | `.\iniciar.bat --puerto 8080` y entrar a `http://localhost:8080`. |

## 8. Qué está probado

- **Probado en el PC de Pedro (CPU):**
  - `iniciar.bat` encuentra el entorno y arranca el servidor;
  - en un PC sin entorno crea `.venv` e instala lo de `requirements.txt`;
  - el servidor lista y carga los 6 modelos y detecta en imágenes, con tracking e IDs;
  - la interfaz (robot, gustos arrastrables, elección por ID) se probó con detecciones simuladas.
- **Falta probar:** con la **webcam real**, en el portátil de la presentación, y medir los FPS de ahí.
- Los FPS de detección pueden ser algo menores que con `modelos/probarModelos/probar_modelo.py`, porque cada frame
  viaja como JPEG del navegador al servidor. El video del televisor sí va a 30 fps.
