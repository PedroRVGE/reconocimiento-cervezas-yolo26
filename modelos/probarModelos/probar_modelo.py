# =====================================================================================
# probar_modelo.py — Probar los modelos de cervezas (como ProbarCamara.py de clase)
#
# Qué hace: carga un modelo entrenado (.pt) y lo prueba
#   - en VIVO con la webcam (1280x720, 30 fps, como en la presentación), o
#   - sobre una IMAGEN, una CARPETA de imágenes o un VIDEO (para "probar con otras imágenes").
# Dibuja las cajas con la marca y la confianza, y muestra los FPS.
#
# Teclas:  ESC = salir   |   g = guardar una captura de lo que se ve
#          (con imágenes: cualquier otra tecla pasa a la siguiente)
# =====================================================================================
from pathlib import Path
import time
import cv2
from ultralytics import YOLO

# ------------------------------- CONFIGURACIÓN ---------------------------------------
# Nombre del archivo .pt que está en la carpeta modelos/ (o una ruta completa a cualquier .pt).
# NO descomprimir el .pt: se usa tal cual.
MODELO = "cervezas_nano_v5.pt"

# Fuente: 0 = webcam principal (1 = otra cámara), o la ruta de una imagen, carpeta o video
FUENTE = 0

CONF = 0.40            # umbral de confianza (recomendado 0.40–0.50; subirlo no corrige confusiones de marca)
IMGSZ = 640            # el mismo tamaño con el que se entrenó
USAR_TRACKING = False  # True = seguimiento con IDs (ByteTrack); solo para webcam/video
ANCHO, ALTO, FPS_CAMARA = 1280, 720, 30   # formato de la webcam del portátil de la presentación
# -------------------------------------------------------------------------------------

CARPETA = Path(__file__).resolve().parent          # modelos/probarModelos/
CARPETA_MODELOS = CARPETA.parent                    # modelos/
CAPTURAS = CARPETA / "capturas"


def ruta_modelo(m):
    """Busca el .pt: primero como ruta, luego por nombre dentro de modelos/."""
    p = Path(m)
    if not p.is_absolute():
        p = CARPETA_MODELOS / p
    if p.suffix != ".pt":
        p = p.with_suffix(".pt")
    if not p.exists():
        disponibles = sorted(x.name for x in CARPETA_MODELOS.glob("*.pt"))
        raise SystemExit(f"No encuentro {p.name} en {CARPETA_MODELOS}.\nModelos disponibles: {disponibles}")
    return p


CLASES_ESPERADAS = {"aguila", "andina", "club_colombia", "costena", "heineken", "poker"}


def revisar_clases(model):
    """Avisa si el modelo NO es uno de los nuestros (p. ej. el yolo26n.pt base de COCO, con 80 clases)."""
    clases = set(model.names.values())
    if clases != CLASES_ESPERADAS:
        print("\n*** OJO: este modelo NO tiene nuestras 6 marcas. ***")
        print(f"    Tiene {len(clases)} clases (ej.: {sorted(clases)[:5]}).")
        print("    Si son 80 clases (person, bottle...), es el modelo base de COCO, no el entrenado.\n")


def dibujar_info(img, texto):
    cv2.putText(img, texto, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2, cv2.LINE_AA)


def guardar(img):
    CAPTURAS.mkdir(exist_ok=True)
    archivo = CAPTURAS / f"captura_{time.strftime('%Y%m%d_%H%M%S')}.jpg"
    cv2.imwrite(str(archivo), img)
    print("Captura guardada:", archivo)


def probar_camara_o_video(model, fuente, nombre):
    cap = cv2.VideoCapture(fuente)
    if isinstance(fuente, int):                     # pedir 720p 30 fps a la webcam
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, ANCHO)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, ALTO)
        cap.set(cv2.CAP_PROP_FPS, FPS_CAMARA)
    if not cap.isOpened():
        raise SystemExit(f"No se pudo abrir la fuente: {fuente}")
    print("Resolución real:", int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), "x", int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))

    t_prev = time.perf_counter()
    while True:
        ok, frame = cap.read()
        if not ok:                                  # se revisa ANTES de usar el frame
            break
        # El frame llega en BGR (1280x720); YOLO lo reescala solo a IMGSZ manteniendo la proporción.
        if USAR_TRACKING:
            r = model.track(frame, persist=True, tracker="bytetrack.yaml", conf=CONF, imgsz=IMGSZ, verbose=False)[0]
        else:
            r = model.predict(frame, conf=CONF, imgsz=IMGSZ, verbose=False)[0]
        vis = r.plot()                              # cajas + marca + confianza (+ ID con tracking)
        t = time.perf_counter()
        fps = 1 / max(t - t_prev, 1e-6)
        t_prev = t
        dibujar_info(vis, f"{nombre} | {fps:.1f} FPS | inferencia {r.speed['inference']:.0f} ms | conf {CONF}")
        cv2.imshow("Probar modelo - ESC para salir", vis)
        tecla = cv2.waitKey(1) & 0xFF
        if tecla == 27:
            break
        if tecla == ord("g"):
            guardar(vis)
    cap.release()
    cv2.destroyAllWindows()


def probar_imagenes(model, fuente, nombre):
    p = Path(fuente)
    ext = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    imagenes = sorted(x for x in p.iterdir() if x.suffix.lower() in ext) if p.is_dir() else [p]
    for img in imagenes:
        r = model.predict(str(img), conf=CONF, imgsz=IMGSZ, verbose=False)[0]
        vis = r.plot()
        clases = [r.names[int(c)] for c in r.boxes.cls]
        print(f"{img.name}: {clases if clases else 'nada detectado'}")
        dibujar_info(vis, f"{nombre} | {img.name} | conf {CONF}")
        cv2.imshow("Probar modelo - tecla = siguiente, ESC = salir", vis)
        tecla = cv2.waitKey(0) & 0xFF
        if tecla == ord("g"):
            guardar(vis)
        if tecla == 27:
            break
    cv2.destroyAllWindows()


if __name__ == "__main__":
    ruta = ruta_modelo(MODELO)
    model = YOLO(str(ruta))
    nombre = ruta.stem
    print("Modelo:", ruta)
    print("Clases:", model.names)
    revisar_clases(model)

    es_video = isinstance(FUENTE, str) and Path(FUENTE).suffix.lower() in {".mp4", ".avi", ".mov", ".mkv"}
    if isinstance(FUENTE, int) or es_video:
        probar_camara_o_video(model, FUENTE, nombre)
    else:
        probar_imagenes(model, FUENTE, nombre)
