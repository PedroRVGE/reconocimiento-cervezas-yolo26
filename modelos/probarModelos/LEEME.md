# probarModelos

Prueba los modelos entrenados con la webcam (1280×720, 30 fps) o con imágenes, carpetas o videos.

## 1. Crear el entorno (una sola vez, en Windows)

Abrir una terminal (PowerShell) **en esta carpeta** (`modelos\probarModelos`):

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Si usas PyCharm: *Settings → Python Interpreter → Add Interpreter → Existing* y elegir `.venv\Scripts\python.exe`.

> También sirve el entorno `yolo` que ya existe en la carpeta del proyecto, porque ya tiene `ultralytics`.

## 2. Elegir el modelo y la fuente

Arriba en `probar_modelo.py`:

```python
MODELO = "cervezas_nano_v5.pt"   # nombre del .pt que está en modelos/ (para la demo: el nano)
FUENTE = 0           # 0 = webcam, o r"C:\ruta\foto.jpg", una carpeta o un video
CONF = 0.40          # recomendado 0.40–0.50 (ver CONTEXTO.md)
```

## 3. Ejecutar

```powershell
python probar_modelo.py
```

- **ESC:** salir.
- **g:** guardar una captura en `capturas/`.
- **Con imágenes:** cualquier otra tecla pasa a la siguiente.

## Organización de los modelos

```
modelos/
├── cervezas_nano_v1.pt / cervezas_small_v1.pt
├── cervezas_nano_v4.pt / cervezas_small_v4.pt
├── cervezas_nano_v5.pt / cervezas_small_v5.pt
└── probarModelos/
```

- Los `.pt` van **directamente en `modelos/`**, con nombre claro (`cervezas_<modelo>_v<versión>.pt`).
- En `MODELO` se pone solo el nombre del archivo. Si no lo encuentra, el script lista los modelos disponibles.
- Al iniciar, el script imprime las clases del modelo y **avisa** si no son nuestras 6 marcas (por ejemplo, si
  por error es el `yolo26n.pt` base de COCO).

**Importante:** el `.pt` **no se descomprime**. Por dentro es un zip, pero se usa tal cual.
