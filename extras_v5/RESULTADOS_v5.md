# Resultados del entrenamiento v5 — 6 marcas de cerveza (YOLO26 nano y small)

Fecha: 2026-10-31 · Notebook ejecutado: `02_ejecutado_v5.ipynb` · Comparación: `comparacion_v5.csv`

## Entorno

| | |
|---|---|
| GPU | **NVIDIA GeForce RTX 3050 6GB Laptop GPU** (driver 572.40, CUDA 12.8), el mismo PC de la v4 |
| Python | 3.12.10 (64 bits), el mismo `.venv` de la v4, sin reinstalar nada |
| PyTorch | 2.11.0+cu128 (`torch.cuda.is_available() == True`) |
| Ultralytics | 8.4.196 |
| Dispositivo de entrenamiento | `CUDA:0 (NVIDIA GeForce RTX 3050 6GB Laptop GPU, 6144MiB)` |
| Configuración | `EPOCAS=200`, `PACIENCIA=50`, `IMGSZ=640`, `BATCH=-1` (automático), `WORKERS=2`, `CONF_MATRIZ=0.40` |
| Kernel | `cervezas-v4` (apunta al mismo `.venv`) |

## Dataset (`cervezas-nao.v5-dataset--110-fotos-de-nosotros---1st-dataaume--v5.yolov8`)

Son las mismas 110 fotos de la v4. Train tiene aumentos ×3; valid y test no tienen aumentos y son exactamente los
mismos archivos que en la v4 (se comprobó por nombre de archivo).

| split | imágenes | fondos (null) | cajas por clase |
|---|---:|---:|---|
| train | 231 (77 × 3) | 15 | aguila 51 · andina 51 · club_colombia 84 · costena 57 · heineken 54 · poker 72 |
| valid | 22 | 2 | aguila 7 · andina 8 · club_colombia 7 · costena 7 · heineken 9 · poker 7 |
| test  | 11 | 0 | aguila 2 · andina 1 · club_colombia 5 · costena 6 · heineken 3 · poker 4 |
| **total** | **264** | **17** | |

Todas las imágenes tienen al menos 640 px de lado.

### Preprocesamiento y aumentos aplicados (según `README.roboflow.txt`)

Preprocesamiento:
- Auto-orientación (se quita la orientación EXIF).
- Redimensionar a 640×640 rellenando con bordes negros (*Fit, black edges*).

Aumentos (3 versiones de cada imagen de train):
- Recorte aleatorio entre 0 y 20 % de la imagen.
- Rotación aleatoria entre −10° y +10°.
- Brillo aleatorio entre −25 % y +25 %.
- Exposición aleatoria entre −15 % y +15 %.
- Desenfoque gaussiano entre 0 y 1.5 px.
- Ruido sal y pimienta en el 1.5 % de los píxeles.

## Épocas entrenadas

| modelo | épocas entrenadas | mejor época (`best.pt`) | tiempo |
|---|---:|---:|---:|
| nano  | 176 de 200 (EarlyStopping) | 126 | 0.190 h (~11 min) |
| small | 95 de 200 (EarlyStopping)  | 45  | 0.193 h (~12 min) |

## Resumen v5

| modelo | split | P | R | mAP50 | mAP50-95 | umbral óptimo (F1) |
|---|---|---:|---:|---:|---:|---:|
| nano  | validación | 0.979 | 0.873 | 0.956 | 0.833 | **0.70** |
| nano  | test       | 0.941 | 0.799 | 0.860 | 0.696 | |
| small | validación | 0.968 | 0.922 | 0.955 | 0.824 | **0.48** |
| small | test       | 0.928 | 0.831 | 0.878 | 0.694 | |

## Comparación v4 vs. v5

| modelo | versión | P val | R val | mAP50 val | mAP50-95 val | P test | R test | mAP50 test | mAP50-95 test | umbral F1 | ms CPU | ms GPU |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| nano  | v4 | 0.985 | 0.949 | **0.990** | **0.884** | 0.839 | **0.840** | 0.874 | **0.750** | 0.50 | 29.5 | 11.4 |
| nano  | v5 | 0.979 | 0.873 | 0.956 | 0.833 | **0.941** | 0.799 | 0.860 | 0.696 | 0.70 | 26.6 | 11.8 |
| small | v4 | 0.984 | 0.917 | **0.964** | **0.854** | 0.848 | **0.873** | **0.895** | **0.747** | 0.76 | 59.3 | 11.5 |
| small | v5 | 0.968 | 0.922 | 0.955 | 0.824 | **0.928** | 0.831 | 0.878 | 0.694 | 0.48 | 60.2 | 13.1 |

Los ms son por frame de 1280×720, promedio de 30 inferencias, medidos en este PC.

**Lectura.** En este entrenamiento, los aumentos ×3 **no mejoraron** las métricas:
- **mAP50-95:** en validación bajó unos 3 a 5 puntos en los dos modelos, y en test unos 5.
- **Test:** la precisión subió (menos detecciones falsas) y el recall bajó (más latas sin detectar).
- **Small:** paró muy pronto, en la época 95, y su mejor época fue la 45.

Una explicación posible es que validación y test no tienen aumentos y se parecen a las fotos originales, así que
entrenar con versiones alteradas no les ayuda en este caso. También puede ser que el rango de los aumentos ya lo
cubrían los aumentos propios de Ultralytics al entrenar. Esto es una hipótesis, no algo comprobado.

**Nota honesta sobre el tamaño del test:** test tiene solo **11 imágenes y 21 cajas**, y validación 22 imágenes y
45 cajas. Con tan pocos ejemplos, una sola lata acertada o fallada mueve el recall de una clase entre 25 y 50 puntos.
Por eso las diferencias pequeñas entre v4 y v5 **no son concluyentes**. Además, cada versión se entrenó una sola vez
con `seed=0`, así que no se sabe cuánto variaría el resultado entre corridas. La tendencia de validación y test
coincide (v5 un poco peor en mAP50-95), pero la diferencia es pequeña.

## Por clase — NANO v5

| clase | P val | R val | mAP50 val | mAP50-95 val | P test | R test | mAP50 test | mAP50-95 test |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| aguila        | 0.97 | 0.86 | 0.98 | 0.84 | 0.84 | 0.50 | 0.49 | 0.45 |
| andina        | 0.99 | 0.88 | 0.94 | 0.79 | 0.83 | 1.00 | 0.99 | 0.90 |
| club_colombia | 1.00 | 1.00 | 0.99 | 0.84 | 1.00 | 0.68 | 0.80 | 0.69 |
| costena       | 0.94 | 0.71 | 0.87 | 0.80 | 0.99 | 1.00 | 0.99 | 0.78 |
| heineken      | 1.00 | 0.94 | 0.99 | 0.84 | 0.99 | 1.00 | 0.99 | 0.73 |
| poker         | 0.99 | 0.86 | 0.95 | 0.89 | 1.00 | 0.62 | 0.89 | 0.64 |

## Por clase — SMALL v5

| clase | P val | R val | mAP50 val | mAP50-95 val | P test | R test | mAP50 test | mAP50-95 test |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| aguila        | 1.00 | 0.93 | 0.99 | 0.88 | 0.84 | 0.50 | 0.58 | 0.45 |
| andina        | 0.88 | 0.90 | 0.98 | 0.81 | 0.81 | 1.00 | 0.99 | 0.90 |
| club_colombia | 0.96 | 1.00 | 0.99 | 0.86 | 1.00 | 0.75 | 0.96 | 0.74 |
| costena       | 1.00 | 0.85 | 0.91 | 0.75 | 0.99 | 1.00 | 0.99 | 0.71 |
| heineken      | 0.97 | 1.00 | 0.99 | 0.85 | 0.92 | 1.00 | 0.99 | 0.83 |
| poker         | 1.00 | 0.86 | 0.85 | 0.79 | 1.00 | 0.73 | 0.74 | 0.55 |

Igual que en la v4, **aguila sigue siendo la clase más débil en test**: solo 1 de las 2 latas se detecta (R 0.50).

## Matrices de confusión (validación, 45 latas)

Rutas:
- Normales: `nano_v5/val/confusion_matrix.png` y `small_v5/val/confusion_matrix.png`, más sus
  `confusion_matrix_normalized.png`.
- Cortadas (solo confianza > 0.40): `nano_v5/val_conf40/confusion_matrix.png` y
  `small_v5/val_conf40/confusion_matrix.png`, más sus `confusion_matrix_normalized.png`.

| matriz | aciertos | marca confundida con otra | latas no detectadas | detecciones en el fondo |
|---|---:|---|---|---:|
| nano v5 normal          | 43 / 45 | aguila→costena, andina→costena | 0 | 82 |
| nano v5 cortada (>0.40) | 40 / 45 | ninguna | 5 (aguila 1, andina 1, costena 2, poker 1) | **0** |
| small v5 normal         | 42 / 45 | aguila→andina, andina→costena | 1 (poker) | 131 |
| small v5 cortada (>0.40)| 41 / 45 | aguila→andina, andina→costena | 2 (costena 1, poker 1) | **0** |
| *nano v4 cortada*       | *42 / 45* | *ninguna* | *3* | *1* |
| *small v4 cortada*      | *42 / 45* | *ninguna* | *3* | *1* |

**Qué muestran comparadas con las normales:**
- **Columna de fondo:** la matriz normal usa el umbral bajo por defecto de `val()`, así que cuenta muchas
  detecciones de baja confianza sobre el fondo (82 en el nano y 131 en el small). Al cortar en 0.40 esa columna
  queda en **0** en los dos modelos v5: ninguna detección por encima de 40 % cae donde no hay lata.
- **Fila de fondo:** a cambio del corte, algunas latas reales quedan por debajo de 0.40 y pasan a "no detectadas".
  Son 5 en el nano y 2 en el small.
- **Confusiones entre marcas:** el nano v5 cortado no confunde ninguna marca, porque las dos confusiones de la
  matriz normal tenían confianza baja. El small v5 cortado mantiene 2 confusiones con confianza alta: una aguila
  tomada como andina y una andina tomada como costena. En la v4, ninguno de los dos modelos tenía confusiones
  entre marcas por encima de 0.40.

## Modelos guardados (verificados)

| archivo | tamaño | `model.names` |
|---|---:|---|
| `modelos/cervezas_nano_v5.pt`  | 5.5 MB  | 6 clases: aguila, andina, club_colombia, costena, heineken, poker |
| `modelos/cervezas_small_v5.pt` | 20.3 MB | 6 clases: aguila, andina, club_colombia, costena, heineken, poker |

Los dos cargan con `ultralytics.YOLO(ruta)`. Los modelos v4 siguen en `modelos/` junto a ellos.

## Integridad de la v4

Antes de empezar se calculó el SHA-256 de **347 archivos** de la v4: `nano_v4/`, `small_v4/`, los dos `.pt` v4,
la carpeta y el `.zip` del dataset v4, `02_ejecutado_v4.ipynb`, `RESULTADOS_v4.md`, `comparacion_v4.csv` y
`nbconvert_v4.log`. Al terminar se recalculó: **los 347 son idénticos**. No se borró ni se sobrescribió nada.

## Problemas y cómo se resolvieron

1. **Ninguno de importancia.** El `.venv` funcionó sin reinstalar nada. No hubo errores de DataLoader ni de
   memoria, así que `WORKERS` y `BATCH` quedaron como estaban.
2. **`data.yaml` repetido en el zip.** El zip de la v5, como el de la v4, trae `data.yaml` dos veces. Se
   descomprimió con `zipfile` de Python en una carpeta nueva, y las dos copias son iguales.
3. **Celda 1.** Solo se cambiaron `DATASET_DIR` y `path`. `VERSION = "v5"`, `CONF_MATRIZ = 0.40` y
   `PROBAR_WEBCAM = False` ya venían así en el notebook actualizado. Antes de ejecutar se revisó que todos los
   nombres de salida dependieran de `VERSION`, para no pisar nada de la v4.
4. **`data.yaml` reescrito.** El notebook reescribió el `data.yaml` **del dataset v5** con rutas completas y dejó
   `data_original.yaml`, como estaba previsto. El de la v4 no se tocó.

No se subió nada a internet.
