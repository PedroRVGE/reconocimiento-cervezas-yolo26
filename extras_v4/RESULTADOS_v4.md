# Resultados del entrenamiento v4 — 6 marcas de cerveza (YOLO26 nano y small)

Fecha: 2026-10-31 · Notebook ejecutado: `02_ejecutado_v4.ipynb` · Comparación: `comparacion_v4.csv`

## Entorno

| | |
|---|---|
| GPU | **NVIDIA GeForce RTX 3050 6GB Laptop GPU** (driver 572.40, CUDA 12.8) |
| Python | 3.12.10 (64 bits), entorno `.venv` |
| PyTorch | 2.11.0+cu128 (`torch.cuda.is_available() == True`) |
| Ultralytics | 8.4.196 |
| Dispositivo de entrenamiento | `CUDA:0 (NVIDIA GeForce RTX 3050 6GB Laptop GPU, 6144MiB)` |
| Configuración | `EPOCAS=200`, `PACIENCIA=50`, `IMGSZ=640`, `BATCH=-1` (automático), `WORKERS=2` |

> **Ojo:** el prompt asumía el PC de Fraquiem con una RTX 4060 de 8 GB. Esta corrida se hizo en otro PC, con una
> RTX 3050 Laptop de 6 GB. Las métricas no cambian por esto, pero los tiempos sí.

## Dataset (`cervezas-nao.v4-dataset-110-fotos-de-nosotros-v4.yolov8`)

| split | imágenes | fondos (null) | cajas por clase |
|---|---:|---:|---|
| train | 77 | 5 | aguila 17 · andina 17 · club_colombia 28 · costena 19 · heineken 18 · poker 24 |
| valid | 22 | 2 | aguila 7 · andina 8 · club_colombia 7 · costena 7 · heineken 9 · poker 7 |
| test  | 11 | 0 | aguila 2 · andina 1 · club_colombia 5 · costena 6 · heineken 3 · poker 4 |
| **total** | **110** | **7** | |

Todas las imágenes tienen al menos 640 px de lado.

## Épocas entrenadas

| modelo | épocas entrenadas | mejor época (`best.pt`) | tiempo |
|---|---:|---:|---:|
| nano  | 181 de 200 (EarlyStopping) | 131 | 0.093 h (~6 min) |
| small | 145 de 200 (EarlyStopping) | 95  | 0.170 h (~10 min) |

## Resumen

| modelo | split | P | R | mAP50 | mAP50-95 | umbral óptimo (F1) |
|---|---|---:|---:|---:|---:|---:|
| nano  | validación | 0.985 | 0.949 | 0.990 | 0.884 | **0.50** |
| nano  | test       | 0.839 | 0.840 | 0.874 | 0.750 | |
| small | validación | 0.984 | 0.917 | 0.964 | 0.854 | **0.76** |
| small | test       | 0.848 | 0.873 | 0.895 | 0.747 | |

Las métricas de test usan solo 11 imágenes y 21 cajas. Por eso son muy ruidosas: un solo error mueve mucho la clase.

## Por clase — NANO

| clase | P val | R val | mAP50 val | mAP50-95 val | P test | R test | mAP50 test | mAP50-95 test |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| aguila        | 1.00 | 0.93 | 0.99 | 0.91 | 0.70 | 0.50 | 0.64 | 0.52 |
| andina        | 0.95 | 0.88 | 0.96 | 0.81 | 0.79 | 1.00 | 0.99 | 0.99 |
| club_colombia | 0.97 | 1.00 | 0.99 | 0.82 | 0.80 | 0.80 | 0.90 | 0.75 |
| costena       | 1.00 | 0.97 | 0.99 | 0.90 | 0.86 | 1.00 | 0.97 | 0.86 |
| heineken      | 0.99 | 1.00 | 0.99 | 0.91 | 0.89 | 1.00 | 0.99 | 0.80 |
| poker         | 1.00 | 0.92 | 0.99 | 0.95 | 1.00 | 0.74 | 0.74 | 0.57 |

## Por clase — SMALL

| clase | P val | R val | mAP50 val | mAP50-95 val | P test | R test | mAP50 test | mAP50-95 test |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| aguila        | 0.93 | 1.00 | 0.99 | 0.88 | 0.74 | 0.50 | 0.49 | 0.45 |
| andina        | 1.00 | 0.88 | 0.88 | 0.74 | 0.66 | 1.00 | 0.99 | 0.90 |
| club_colombia | 0.99 | 1.00 | 0.99 | 0.82 | 0.80 | 0.80 | 0.90 | 0.74 |
| costena       | 1.00 | 0.74 | 0.93 | 0.88 | 0.93 | 1.00 | 0.99 | 0.84 |
| heineken      | 0.99 | 1.00 | 0.99 | 0.87 | 0.96 | 1.00 | 0.99 | 0.81 |
| poker         | 1.00 | 0.89 | 0.99 | 0.93 | 1.00 | 0.94 | 0.99 | 0.75 |

En los dos modelos, **aguila es la clase más débil en test**: solo 1 de las 2 latas se detecta (R 0.50).

## Velocidad (frame de 1280×720, `imgsz=640`, promedio de 30 inferencias)

| modelo | CPU (ms/frame) | GPU RTX 3050 (ms/frame) |
|---|---:|---:|
| nano  | 29.5 | 11.4 |
| small | 59.3 | 11.5 |

Para ir a 30 fps hacen falta menos de ~33 ms por frame. En GPU los dos modelos van sobrados. En CPU solo el nano
queda por debajo, y por poco. Hay que volver a medir en el portátil de la presentación (sección 8 del notebook).

## Modelos guardados (verificados)

| archivo | tamaño | `model.names` |
|---|---:|---|
| `modelos/cervezas_nano_v4.pt`  | 5.5 MB  | 6 clases: aguila, andina, club_colombia, costena, heineken, poker |
| `modelos/cervezas_small_v4.pt` | 20.3 MB | 6 clases: aguila, andina, club_colombia, costena, heineken, poker |

Los dos cargan con `ultralytics.YOLO(ruta)` y tienen exactamente las 6 marcas (no las 80 clases de COCO).

## Problemas y cómo se resolvieron

1. **Otra GPU.** El prompt esperaba una RTX 4060 de 8 GB y este PC tiene una RTX 3050 Laptop de 6 GB. No hubo
   que cambiar nada: `BATCH=-1` se ajustó solo a la memoria disponible y no hubo `CUDA out of memory`.
2. **Dataset comprimido.** En `Datasets/` solo estaba el `.zip`. Se descomprimió en
   `Datasets/cervezas-nao.v4-dataset-110-fotos-de-nosotros-v4.yolov8/` y el zip se dejó intacto. El zip trae
   `data.yaml` repetido, así que `Expand-Archive` dio un aviso, pero todo lo demás se extrajo bien (110 imágenes,
   110 etiquetas).
3. **No había Python.** Solo estaba el alias de la Microsoft Store. Se instaló Python 3.12.10 con
   `winget install -e --id Python.Python.3.12` y se creó `.venv` con ese ejecutable.
4. **Comando de PyTorch.** La página <https://pytorch.org/get-started/locally/> se arma con JavaScript y no se pudo
   leer el comando. Como el driver soporta hasta CUDA 12.8, se usó el índice oficial
   `--index-url https://download.pytorch.org/whl/cu128`. Se comprobó `+cu128` y `True` antes y después de instalar
   ultralytics.
5. **Kernel de Jupyter.** Se registró el kernel `cervezas-v4`, que apunta a `.venv`, y se ejecutó con
   `--ExecutePreprocessor.kernel_name=cervezas-v4` para que el notebook usara ese Python.
6. **Sin errores de DataLoader.** No hizo falta cambiar `WORKERS` (quedó en 2) ni `BATCH`.

En la celda 1 solo cambiaron `DATASET_DIR` y `path`. El notebook reescribió `data.yaml` con rutas completas y dejó
`data_original.yaml`, como estaba previsto. Ultralytics descargó los pesos base `yolo26n.pt` y `yolo26s.pt` en la
carpeta del proyecto. No se subió nada a internet.
