@echo off
REM =====================================================================
REM  iniciar.bat - Doble clic para abrir la demo "Naito virtual".
REM  La PRIMERA vez crea el entorno .venv e instala todo (necesita internet).
REM  Las siguientes veces solo arranca el servidor y abre el navegador.
REM  Se le pueden pasar opciones:  iniciar.bat --puerto 8080
REM =====================================================================
chcp 65001 >nul
cd /d "%~dp0"

REM 1. Buscar un Python que ya tenga el entorno listo
set "PY="
if exist ".venv\Scripts\python.exe" set "PY=.venv\Scripts\python.exe"
if not defined PY if exist "..\yolo\Scripts\python.exe" set "PY=..\yolo\Scripts\python.exe"
if not defined PY if exist "..\modelos\probarModelos\.venv\Scripts\python.exe" set "PY=..\modelos\probarModelos\.venv\Scripts\python.exe"

REM 2. Si no hay ninguno, crear .venv aqui mismo
if not defined PY call :crear_entorno
if not defined PY goto :fin

REM 3. Comprobar que esten las librerias; si falta alguna, instalarla
"%PY%" -c "import ultralytics, cv2, lap" 2>nul
if errorlevel 1 (
    echo Faltan librerias. Instalando las de requirements.txt, puede tardar unos minutos...
    "%PY%" -m pip install -r requirements.txt
)

echo.
echo Usando Python: %PY%
echo NO cierres esta ventana mientras usas la demo. Para salir: Ctrl+C o cerrar la ventana.
echo.
"%PY%" servidor.py %*
goto :fin

:crear_entorno
echo No encontre un entorno de Python. Creando .venv, solo pasa la primera vez...
where py >nul 2>nul
if not errorlevel 1 (
    py -3 -m venv .venv
) else (
    python -m venv .venv
)
if not exist ".venv\Scripts\python.exe" (
    echo.
    echo ERROR: no se pudo crear el entorno. Instala Python desde https://www.python.org/downloads/
    echo marcando la casilla "Add python.exe to PATH", y vuelve a abrir iniciar.bat.
    exit /b 1
)
set "PY=.venv\Scripts\python.exe"
"%PY%" -m pip install --upgrade pip
echo Instalando ultralytics, opencv y lap. Puede tardar varios minutos...
"%PY%" -m pip install -r requirements.txt
exit /b 0

:fin
pause
