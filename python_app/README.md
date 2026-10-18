# 🎙️ NotebookLM Studio to YouTube Video Generator

Generador profesional, modular y production-ready en Python (Streamlit) para convertir documentos, artículos y notas en podcasts de doble locutor estilo *NotebookLM Audio Overview*, con síntesis de voz neuronal (`edge-tts`), ondas de sonido reactivas, avatares sincronizados y compilación a vídeo `.mp4` optimizado para YouTube (16:9) y YouTube Shorts (9:16).

---

## 🚀 Características Principales

1. **Ingesta Inteligente de Documentos**:
   - Soporte para archivos `.pdf`, `.txt` y `.md` o texto pegado directamente.
2. **Motor de Guion con Gemini**:
   - Usa el SDK oficial `google-genai` con **Structured Outputs** mediante esquemas Pydantic (`DialogueTurn`, `PodcastScript`).
   - Simula química conversacional genuina con muletillas naturales, analogías cotidianas y asignación de emociones.
3. **Síntesis de Voz Desacoplada (TTS)**:
   - **Opción A (Predeterminada / Gratuita)**: `edge-tts` con voces neuronales multilingües de Microsoft (masculinas y femeninas) con marcas de tiempo precisas.
   - **Opción B**: ElevenLabs API (opcional mediante API key).
   - Inserción automática de pausas de respiración y silencios orgánicos (0.2s - 0.4s) entre interlocutores.
4. **Ensamblado de Vídeo Automático**:
   - Generación de vídeo `.mp4` con `moviepy` y `ffmpeg`.
   - Formatos 16:9 (Horizontal para YouTube) y 9:16 (Vertical para YouTube Shorts / TikTok).
   - Avatares con halo reactivo al locutor activo.
   - Barras de espectro de audio animadas.
   - Subtítulos dinámicos y banners de títulos conceptuales (`visual_title`).

---

## 📁 Estructura Modular del Proyecto

```text
notebooklm-studio/
├── app.py              # Interfaz de usuario en Streamlit (UI/UX, sidebar, visualizador)
├── generator.py        # Motor de generación de guiones con Gemini y Pydantic
├── tts_engine.py       # Motor desacoplado de TTS (Edge-TTS & ElevenLabs)
├── video_engine.py     # Ensamblado de vídeo con MoviePy, Canvas PIL y FFmpeg
├── requirements.txt    # Dependencias fijadas del proyecto
└── README.md           # Guía de instalación y despliegue
```

---

## 🛠️ Requisitos Previos e Instalación

### 1. Requisitos del Sistema
- **Python 3.10 o superior**
- **FFmpeg** instalado en el sistema (requerido por `moviepy` y procesamiento de audio/vídeo).

#### Instalación de FFmpeg:
- **Ubuntu/Debian**:
  ```bash
  sudo apt update && sudo apt install -y ffmpeg
  ```
- **macOS (Homebrew)**:
  ```bash
  brew install ffmpeg
  ```
- **Windows**:
  ```powershell
  winget install Gyan.FFmpeg
  # O descarga los binarios oficiales y agrégalos a tu variable de entorno PATH
  ```

### 2. Crear un entorno virtual y dependencias
```bash
# 1. Clonar o navegar al directorio del proyecto
cd notebooklm-studio

# 2. Crear entorno virtual
python -m venv venv

# 3. Activar entorno virtual
# En Linux/macOS:
source venv/bin/activate
# En Windows:
venv\Scripts\activate

# 4. Instalar dependencias
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 🔑 Configuración de la Clave de API de Gemini

Puedes configurar tu clave de API de dos maneras:

### Opción 1: Variable de entorno
```bash
export GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"  # Linux/macOS
set GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"     # Windows CMD
$env:GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"    # Windows PowerShell
```

### Opción 2: Directamente en la interfaz de Streamlit
Al ejecutar la aplicación, dispones de un campo de contraseña en la barra lateral izquierda para introducir tu clave de API. Solo se conserva en memoria durante tu sesión de navegación.

---

## ▶️ Ejecución de la Aplicación

Inicia el servidor local de Streamlit ejecutando:

```bash
streamlit run app.py
```

La aplicación se abrirá automáticamente en tu navegador predeterminado en:
`http://localhost:8501`

---

## 🎬 Flujo de Trabajo en la Interfaz

1. **Ingesta de Documentos (Tab 1)**: Sube tus archivos PDF o pega el texto que deseas convertir en podcast. Haz clic en **Generar Guion de Podcast**.
2. **Guion y Edición (Tab 2)**: Revisa el guion estructurado. Modifica cualquier línea de diálogo, ajusta la emoción asignada o edita los títulos visuales.
3. **Síntesis de Audio (Tab 3)**: Pulsa **Sintetizar Audio Completo** para generar los diálogos neuronales y unirlos con pausas naturales. Puedes escuchar el resultado y descargar el `.mp3`.
4. **Renderizado de Vídeo Final (Tab 4)**: Haz clic en **Renderizar Vídeo Final para YouTube**. Al finalizar, previsualiza el vídeo y descárgalo en `.mp4` (H.264 / AAC) listo para subir a YouTube.

## 📦 Uso con Paquete de Assets Descargado del Estudio Web

Si descargaste el archivo `notebooklm_studio_bundle.zip` desde la aplicación web:

1. **Descomprime el archivo**:
   ```bash
   unzip notebooklm_studio_bundle.zip
   cd notebooklm_youtube_studio
   ```
2. **Ejecuta la aplicación**:
   ```bash
   streamlit run app.py
   ```
3. **Carga automática**:
   `app.py` detectará automáticamente el archivo `script.json`, los subtítulos `subtitles.srt`, el logo `icono.png` y las pistas de audio e imágenes en `assets/`, permitiéndote reproducir el audio y renderizar el vídeo MP4 inmediatamente sin necesidad de volver a llamar a la API.

---

## 📄 Licencia
Este proyecto es de código abierto bajo la licencia MIT.
Desarrollado para Un Fantasma en el Sistema (https://www.unfantasmaenelsistema.com/).
