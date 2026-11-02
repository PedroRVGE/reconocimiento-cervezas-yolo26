# =====================================================================================
# ProbarCamara.py  (copia COMENTADA: el código es idéntico al original, solo se agregaron líneas con #)
# Qué hace: abre la webcam del PC, pasa cada imagen (frame) por YOLO y dibuja en vivo las cajas
# con el nombre del objeto y su confianza. Se cierra con la tecla ESC.
# Es la base del detector del trabajo NAO: allá, en vez de la webcam, los frames llegarán de la
# cámara de NAO por la red (IP). El modelo sigue corriendo en el PC; a NAO no se le carga nada.
# =====================================================================================
# Las dos líneas siguientes son recordatorios de qué instalar (en la terminal):
# pip install opencv-python
# (OJO: 'ultralythics' tiene un error de escritura; el paquete se llama 'ultralytics'.)
# pip install ultralythics 
# Importar la clase YOLO (para cargar el modelo y predecir)
from ultralytics import YOLO 
# OpenCV: abrir la cámara, dibujar rectángulos/texto y mostrar la ventana
import cv2
# random se importa pero no se usa (los colores ahora salen de una paleta fija)
import random 
# Cargar YOLO26 nano preentrenado con COCO (80 clases). Es el más pequeño y rápido: ideal para tiempo real.
model = YOLO("yolo26n.pt")
# Abrir la cámara número 0 (la webcam principal del PC). Con 1, 2... se eligen otras cámaras.
video_capture = cv2.VideoCapture(0)
# Lista de colores para las cajas. OJO: OpenCV usa el orden BGR (azul, verde, rojo), no RGB.
# Por eso los nombres de los comentarios no coinciden con lo que se ve: (255, 0, 0) se ve AZUL,
# (0, 0, 255) se ve ROJO, (255, 255, 0) se ve CIAN y (0, 255, 255) se ve AMARILLO.
PALETA_COLORES = [
    (255, 0, 0),    # Rojo
    (0, 255, 0),    # Verde
    (0, 0, 255),    # Azul
    (255, 255, 0),  # Amarillo
    (255, 0, 255),  # Magenta
    (0, 255, 255),  # Cian
]

# Bucle infinito: se repite una vez por cada frame hasta que se presione ESC
while(True):
    # Leer un frame de la cámara: ret = True si se pudo leer; frame = la imagen (matriz alto x ancho x 3, en BGR)
    ret, frame = video_capture.read()
    ## Vamos a tomar el frame y con el resultado de YOLO vamos a dibujar los rectangulos de la imagen
    # Detectar objetos en el frame. Devuelve una lista con un resultado (porque es una sola imagen).
    # OJO: si la cámara falla, frame es None y esta línea da error ANTES de llegar al 'if not ret' de más abajo.
    results = model.predict(frame)
    # diccionario {número de clase: nombre}
    class_names = results[0].names
    # Asignar un color de la paleta a cada clase (se recalcula en cada frame; funciona, aunque no hace falta repetirlo)
    colors = {}
    # enumerate da la posición i y el nombre de cada clase
    for i, cls_name in enumerate(class_names.values()):
    # El operador % evita errores si tienes más clases que colores en la paleta
        # i % 6 da 0,1,2,3,4,5,0,1... para reutilizar los 6 colores en las 80 clases
        colors[cls_name] = PALETA_COLORES[i % len(PALETA_COLORES)]
    # Recorrer cada objeto detectado en este frame
    for box in results[0].boxes:
       # esquinas de la caja en píxeles: (x1, y1) arriba-izquierda, (x2, y2) abajo-derecha
       x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
       # nombre de la clase detectada
       cls=results[0].names[int(box.cls[0])]
       # confianza (0 a 1) redondeada a 4 decimales
       conf=round(float(box.conf[0]),4)
       # color de esa clase
       color=colors[cls]
       # imprimir en la consola lo detectado (sirve para depurar)
       print((x1, y1), (x2, y2), cls, conf)
       # dibujar el rectángulo sobre el frame (grosor 6)
       frame=cv2.rectangle(frame, (x1, y1), (x2, y2), color, 6)
       # escribir 'clase-XX.XX%' 10 píxeles encima de la caja
       frame=cv2.putText(frame, cls+"-" "{:.2f}".format(conf*100)+"%", (x1,y1-10), cv2.FONT_HERSHEY_SIMPLEX, 1.5, color, 6, cv2.LINE_AA)
       
    # Si no se pudo leer la cámara, salir del bucle (ver el OJO de arriba)
    if not ret:
        break
    # Mostrar el frame con las cajas en una ventana llamada 'frame'
    cv2.imshow('frame', frame)
    # waitKey(1) espera 1 ms por una tecla (y deja que la ventana se actualice). 27 es el código de ESC.
    if cv2.waitKey(1) & 0xFF == 27:
        break
# Al salir: liberar la cámara (para que otros programas puedan usarla)...
video_capture.release()
# ...y cerrar las ventanas de OpenCV
cv2.destroyAllWindows()
