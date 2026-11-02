# =====================================================================================
# servidor.py — "Naíto virtual": servidor local de la demo de presentación
#
# Qué hace:
#   - Sirve la página web de web/ (el bar caricaturesco con el robot Naíto).
#   - Lista los modelos .pt que hay en la carpeta modelos/ y carga el que se elija.
#   - Recibe cada frame de la webcam (JPEG) desde el navegador, corre YOLO y devuelve
#     las detecciones en JSON. El navegador dibuja las cajas y mueve al robot.
#
# Solo usa la librería estándar de Python + ultralytics + opencv (lo mismo que probar_modelo.py),
# así que sirve el entorno "yolo" del proyecto o el .venv de modelos/probarModelos.
#
# Uso:   python servidor.py            (abre el navegador solo en http://localhost:8000)
#        python servidor.py --puerto 8080 --no-abrir
# =====================================================================================
import argparse
import json
import threading
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import cv2
import numpy as np
import torch
from ultralytics import YOLO

# ------------------------------- CONFIGURACIÓN ---------------------------------------
CARPETA = Path(__file__).resolve().parent              # presentacion/
CARPETA_WEB = CARPETA / "web"
CARPETA_MODELOS = CARPETA.parent / "modelos"           # los .pt van directamente en modelos/
MODELO_POR_DEFECTO = "cervezas_small_v6.pt"            # para la demo: el small v6 (mejor en test)
IMGSZ = 640                                            # el mismo tamaño con el que se entrenó
CLASES_ESPERADAS = {"aguila", "andina", "club_colombia", "costena", "heineken", "poker"}
MAX_BYTES = 5 * 1024 * 1024                            # un frame JPEG de 720p pesa ~150 KB; más que esto se rechaza
# -------------------------------------------------------------------------------------

DISPOSITIVO = 0 if torch.cuda.is_available() else "cpu"
NOMBRE_DISPOSITIVO = f"GPU ({torch.cuda.get_device_name(0)})" if DISPOSITIVO == 0 else "CPU"

estado = {"modelo": None, "nombre": None}
candado = threading.Lock()                             # YOLO no se llama desde dos hilos a la vez


def modelos_disponibles():
    return sorted(p.name for p in CARPETA_MODELOS.glob("*.pt"))


def cargar_modelo(nombre):
    """Carga un .pt de modelos/ (solo por nombre, para no abrir rutas arbitrarias) y lo 'calienta'."""
    if nombre not in modelos_disponibles():
        raise ValueError(f"No existe {nombre} en {CARPETA_MODELOS}")
    with candado:
        if estado["nombre"] != nombre:                 # si ya está cargado (p. ej. por la precarga), no repetir
            model = YOLO(str(CARPETA_MODELOS / nombre))
            # Primera inferencia de prueba con un frame negro de 1280x720 para que la demo no se trabe al inicio
            model.predict(np.zeros((720, 1280, 3), np.uint8), imgsz=IMGSZ, device=DISPOSITIVO, verbose=False)
            estado["modelo"], estado["nombre"] = model, nombre
            print(f"Modelo cargado: {nombre} | {NOMBRE_DISPOSITIVO}")
        model = estado["modelo"]
    clases = [model.names[i] for i in sorted(model.names)]
    aviso = None
    if set(clases) != CLASES_ESPERADAS:
        aviso = f"Este modelo NO tiene nuestras 6 marcas ({len(clases)} clases). ¿Es el modelo base de COCO?"
    return {"nombre": nombre, "clases": clases, "dispositivo": NOMBRE_DISPOSITIVO, "aviso": aviso}


def detectar(jpeg, conf, tracking):
    """Decodifica el JPEG (BGR, como cv2 en probar_modelo.py) y corre YOLO. Cajas normalizadas 0–1."""
    frame = cv2.imdecode(np.frombuffer(jpeg, np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("No se pudo decodificar la imagen")
    with candado:
        model = estado["modelo"]
        if model is None:
            raise ValueError("Todavía no hay un modelo cargado")
        if tracking:
            r = model.track(frame, persist=True, tracker="bytetrack.yaml", conf=conf, imgsz=IMGSZ,
                            device=DISPOSITIVO, verbose=False)[0]
        else:
            r = model.predict(frame, conf=conf, imgsz=IMGSZ, device=DISPOSITIVO, verbose=False)[0]
    cajas = []
    ids = r.boxes.id.tolist() if r.boxes.id is not None else [None] * len(r.boxes)
    for xyxy, c, k, i in zip(r.boxes.xyxyn.tolist(), r.boxes.conf.tolist(), r.boxes.cls.tolist(), ids):
        cajas.append({"clase": r.names[int(k)], "conf": round(c, 3), "caja": [round(v, 4) for v in xyxy],
                      "id": None if i is None else int(i)})
    return {"cajas": cajas, "ms": round(r.speed["inference"], 1),
            "ancho": frame.shape[1], "alto": frame.shape[0]}


class Manejador(SimpleHTTPRequestHandler):
    # En Windows el registro a veces dice que .js es text/plain: se fija a mano
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript",
                      ".css": "text/css", ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml"}

    def log_message(self, *args):                      # sin una línea por cada frame en la consola
        pass

    def responder(self, datos, codigo=200):
        cuerpo = json.dumps(datos).encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(cuerpo)

    def es_de_la_demo(self):
        """Solo acepta peticiones de NUESTRA página (http://localhost:<puerto>). Así otra página web abierta en el
        navegador no puede usar el servidor a escondidas (CSRF / DNS rebinding)."""
        puerto = self.server.server_address[1]
        permitidos = {f"localhost:{puerto}", f"127.0.0.1:{puerto}"}
        if self.headers.get("Host", "") not in permitidos:
            return False
        origen = self.headers.get("Origin")
        return origen is None or origen in {f"http://{h}" for h in permitidos}

    def do_GET(self):
        if not self.es_de_la_demo():
            return self.responder({"error": "petición no permitida"}, 403)
        if urlparse(self.path).path == "/api/modelos":
            return self.responder({"modelos": modelos_disponibles(), "actual": estado["nombre"],
                                   "por_defecto": MODELO_POR_DEFECTO, "dispositivo": NOMBRE_DISPOSITIVO})
        return super().do_GET()                        # archivos de web/

    def do_POST(self):
        url = urlparse(self.path)
        largo = int(self.headers.get("Content-Length", 0) or 0)
        tipo = self.headers.get("Content-Type", "")
        if not self.es_de_la_demo():
            return self.responder({"error": "petición no permitida"}, 403)
        if largo > MAX_BYTES:
            return self.responder({"error": "petición demasiado grande"}, 413)
        # Un formulario de otra página no puede mandar estos tipos sin permiso del navegador
        if (url.path == "/api/cargar" and not tipo.startswith("application/json")) or \
           (url.path == "/api/detectar" and not tipo.startswith("image/jpeg")):
            return self.responder({"error": "tipo de contenido no permitido"}, 415)
        cuerpo = self.rfile.read(largo)
        try:
            if url.path == "/api/cargar":
                return self.responder(cargar_modelo(json.loads(cuerpo)["modelo"]))
            if url.path == "/api/detectar":
                q = parse_qs(url.query)
                conf = float(q.get("conf", ["0.5"])[0])
                tracking = q.get("tracking", ["0"])[0] == "1"
                return self.responder(detectar(cuerpo, conf, tracking))
            self.responder({"error": "ruta desconocida"}, 404)
        except Exception as e:                         # el error se muestra en la página, no tumba el servidor
            self.responder({"error": str(e)}, 400)


def main():
    ap = argparse.ArgumentParser(description="Demo Naíto virtual")
    ap.add_argument("--puerto", type=int, default=8000)
    ap.add_argument("--no-abrir", action="store_true", help="no abrir el navegador automáticamente")
    args = ap.parse_args()

    print("Modelos disponibles:", modelos_disponibles())
    print("Dispositivo:", NOMBRE_DISPOSITIVO)
    # El modelo por defecto se precarga en segundo plano: la página (con la puerta del bar) abre al instante
    # y, para cuando alguien presiona "Entrar", normalmente el modelo ya está listo.
    if MODELO_POR_DEFECTO in modelos_disponibles():
        threading.Thread(target=cargar_modelo, args=(MODELO_POR_DEFECTO,), daemon=True).start()

    # Solo escucha en 127.0.0.1: la demo es local, nadie más en la red puede usarla
    servidor = ThreadingHTTPServer(("127.0.0.1", args.puerto), partial(Manejador, directory=str(CARPETA_WEB)))
    url = f"http://localhost:{args.puerto}"
    print(f"\nNaíto está listo en {url}   (Ctrl+C para cerrar)\n")
    if not args.no_abrir:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nCerrando...")
        servidor.server_close()


if __name__ == "__main__":
    main()
