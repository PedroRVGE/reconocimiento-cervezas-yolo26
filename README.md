# Reconocimiento de marcas de cerveza con YOLO26 🍺 — Bar Naíto

Trabajo de **Inteligencia Artificial** (Universidad EIA, semestre 6). Grupo: Pedro, Pablo, Perez, Emanuel, Samuel y
Andres.

Entrenamos modelos **YOLO26 (Ultralytics)** que detectan **6 marcas de cerveza en lata**: `aguila`, `andina`,
`club_colombia`, `costena`, `heineken` y `poker`. Los demostramos en tiempo real con la webcam del portátil en la
demo **"Bar Naíto"**: un robot caricaturesco estilo NAO, en un saloon del oeste, que señala la cerveza que más le
gusta de las que ve.

---

## Inicio rápido: correr la demo

1. Tener **Python 3.10 o superior** (recomendado 3.12), instalado desde <https://www.python.org/downloads/> con la
   casilla **"Add python.exe to PATH"** marcada.
2. Clonar el repositorio:

   ```powershell
   git clone <URL-del-repositorio>
   ```

3. Doble clic en **`IniciarBarNaito.bat`**.
   - **La primera vez** crea un entorno `presentacion\.venv` e instala todo solo. Necesita internet y tarda varios
     minutos, porque descarga PyTorch.
   - **Las siguientes veces** arranca de una.
4. Se abre el navegador en `http://localhost:8000`. Presionar **"Entrar al Bar Naíto"** y **permitir la cámara**.
5. **No cerrar la ventana negra (consola)** mientras se usa la demo.

Todos los detalles (panel, teclas, cómo funciona y problemas comunes) están en
**[presentacion/LEEME.md](presentacion/LEEME.md)**.

## Qué hay en el repositorio

```
├── IniciarBarNaito.bat            ← DOBLE CLIC: abre la demo
├── README.md                      ← este archivo
├── presentacion/                  ← la demo "Bar Naíto"
│   ├── iniciar.bat                   (lo llama IniciarBarNaito.bat)
│   ├── servidor.py                   servidor local: carga el .pt y corre YOLO (+ tracking ByteTrack)
│   ├── requirements.txt              ultralytics, opencv-python, lap
│   ├── LEEME.md                      guía completa de la demo
│   └── web/                          la página: entrada del saloon, bar, robot, televisor y panel
├── modelos/                       ← modelos entrenados (no se descomprimen: se usan tal cual)
│   ├── cervezas_nano_v1.pt / cervezas_small_v1.pt
│   ├── cervezas_nano_v4.pt / cervezas_small_v4.pt
│   ├── cervezas_nano_v5.pt / cervezas_small_v5.pt
│   ├── cervezas_nano_v6.pt / cervezas_small_v6.pt      ← la demo arranca con el small v6
│   └── probarModelos/                probar_modelo.py: probar un .pt con webcam, imágenes o video (OpenCV)
├── NotebooksEjecutados/           ← notebooks de entrenamiento CON sus resultados
│   ├── 01_Ejecutado.ipynb            primer entrenamiento (dataset v1)
│   ├── 02_ejecutado_v4.ipynb         entrenamiento con el dataset v4
│   ├── 02_ejecutado_v5.ipynb         entrenamiento con el dataset v5 (aumentos x3)
│   └── 02_ejecutado_v6.ipynb         entrenamiento con el dataset v6 (fotos de v4 + fotos de webcam)
├── GuiasClase/
│   └── ProbarCamara.py (+ _comentado)   script de la clase para probar la cámara
├── extras_v4/RESULTADOS_v4.md, comparacion_v4.csv
└── extras_v5/RESULTADOS_v5.md, comparacion_v5.csv
```

## Resultados (resumen)

Tomado de [extras_v5/RESULTADOS_v5.md](extras_v5/RESULTADOS_v5.md). Los ms son por frame de 1280×720, medidos en el
PC de entrenamiento.

| modelo | versión | mAP50 val | mAP50-95 val | mAP50 test | mAP50-95 test | umbral F1 | ms CPU | ms GPU |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| nano  | v4 | 0.990 | 0.884 | 0.874 | 0.750 | 0.50 | 29.5 | 11.4 |
| nano  | v5 | 0.956 | 0.833 | 0.860 | 0.696 | 0.70 | 26.6 | 11.8 |
| small | v4 | 0.964 | 0.854 | 0.895 | 0.747 | 0.76 | 59.3 | 11.5 |
| small | v5 | 0.955 | 0.824 | 0.878 | 0.694 | 0.48 | 60.2 | 13.1 |

El dataset es pequeño (validación de 22 imágenes y test de 11), así que cada error mueve bastante las métricas.

## Probar un modelo sin la demo

Con `modelos/probarModelos/probar_modelo.py` se prueba cualquier `.pt` con la webcam (1280×720, 30 fps), o con una
imagen, una carpeta o un video. Instrucciones en
[modelos/probarModelos/LEEME.md](modelos/probarModelos/LEEME.md).

## Notas

- **Los datasets no están en el repo:** viven en Roboflow (workspace `ia-8qlm8`, proyecto `cervezas-nao`).
  Para reentrenar, se pega el enlace de exportación de esa versión en `ROBOFLOW_URL` (celda de configuración) o se
  usa un `.zip` descargado a mano (`ZIP_MANUAL`).
- **Los notebooks están ejecutados** para ver los resultados. Para reentrenar hace falta GPU con PyTorch + CUDA y la
  ruta del dataset en la celda de configuración.
