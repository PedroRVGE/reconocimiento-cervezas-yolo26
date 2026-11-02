# pip install opencv-python
# pip install ultralythics 
from ultralytics import YOLO 
import cv2
import random 
model = YOLO("yolo26n.pt")
video_capture = cv2.VideoCapture(0)
PALETA_COLORES = [
    (255, 0, 0),    # Rojo
    (0, 255, 0),    # Verde
    (0, 0, 255),    # Azul
    (255, 255, 0),  # Amarillo
    (255, 0, 255),  # Magenta
    (0, 255, 255),  # Cian
]

while(True):
    ret, frame = video_capture.read()
    ## Vamos a tomar el frame y con el resultado de YOLO vamos a dibujar los rectangulos de la imagen
    results = model.predict(frame)
    class_names = results[0].names
    colors = {}
    for i, cls_name in enumerate(class_names.values()):
    # El operador % evita errores si tienes más clases que colores en la paleta
        colors[cls_name] = PALETA_COLORES[i % len(PALETA_COLORES)]
    for box in results[0].boxes:
       x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
       cls=results[0].names[int(box.cls[0])]
       conf=round(float(box.conf[0]),4)
       color=colors[cls]
       print((x1, y1), (x2, y2), cls, conf)
       frame=cv2.rectangle(frame, (x1, y1), (x2, y2), color, 6)
       frame=cv2.putText(frame, cls+"-" "{:.2f}".format(conf*100)+"%", (x1,y1-10), cv2.FONT_HERSHEY_SIMPLEX, 1.5, color, 6, cv2.LINE_AA)
       
    if not ret:
        break
    cv2.imshow('frame', frame)
    if cv2.waitKey(1) & 0xFF == 27:
        break
video_capture.release()
cv2.destroyAllWindows()
