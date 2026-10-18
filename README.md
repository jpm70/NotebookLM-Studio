# 🎙️ NotebookLM Studio to YouTube Video Generator
### Un Fantasma en el Sistema ([www.unfantasmaenelsistema.com](https://www.unfantasmaenelsistema.com/))

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-yellow?logo=python&logoColor=white)](https://www.python.org/)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.35%2B-FF4B4B?logo=streamlit&logoColor=white)](https://streamlit.io/)
[![Edge--TTS](https://img.shields.io/badge/Edge--TTS-Neural_Voices-0078D7?logo=microsoft&logoColor=white)](https://github.com/rany2/edge-tts)
[![MoviePy](https://img.shields.io/badge/MoviePy-Video_Engine-red)](https://zulko.github.io/moviepy/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-texto_·_voz_·_imagen-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-en_vivo-222?logo=github)](https://jpm70.github.io/NotebookLM-Studio/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

> **Generador integral, modular y profesional para transformar artículos, papers y documentos técnicos en podcasts de vídeo listos para YouTube y YouTube Shorts**, con diálogo espontáneo entre dos locutores al estilo *NotebookLM Audio Overview*, síntesis neuronal ultra HD, avatares reactivos, fondos anime consistentes en lote, terminal interactiva con coloreado de sintaxis, tablas autoadaptables, post-intro cinemática y exportación autónoma tanto en vídeo MP4 directo como en paquete ejecutable local de Python auditado al 100%.

---

## ▶️ Úsalo ya en el navegador

**👉 [jpm70.github.io/NotebookLM-Studio](https://jpm70.github.io/NotebookLM-Studio/)**

No hay servidor: todo se ejecuta en tu navegador con **tu propia clave de Gemini**.

1. **Configurar API Key** (barra superior) → pega tu clave de [Google AI Studio](https://aistudio.google.com/apikey). Se guarda solo en este navegador (`localStorage`) y solo viaja a `generativelanguage.googleapis.com`.
2. **1. Ingesta** → arrastra el `.html` del artículo de unfantasmaenelsistema.com. La app detecta título, subtítulo, categoría, puntos, tablas y bloques de comandos.
3. **Generar Guion Estructurado** → Gemini escribe el diálogo entre los dos locutores, con una diapositiva por punto y diapositivas propias para cada tabla y terminal. (Sin clave también puedes usar *Generar Diapositivas 1:1 Directas*, que monta el guion solo con el artículo.)
4. **4. Vídeo Final → Ajustes & Portada → Fondos de las diapositivas**: un fondo por diapositiva, con el mismo estilo y paleta en todas. Eliges el origen:
   - **Gratis (sin clave):** generador Pollinations (Flux). Su límite anónimo es de 1 imagen cada 45 s, así que 9 fondos tardan unos 7 min; la app espera sola y recorta su pequeña marca de agua. Los prompts se envían a `image.pollinations.ai`.
   - **Manual con Gemini:** la app te da el prompt de cada diapositiva (copiar uno, copiar todos o descargar `.txt`). Lo pegas en la [app de Gemini](https://gemini.google.com/app), descargas la imagen y la subes en su diapositiva (botón *Subir* o arrastrando). Con *Subir varias*, los archivos `03.png` o `diapositiva-03.png` van a la diapositiva 3 y el resto rellena en orden los huecos libres.
   - **Gemini API:** con tu clave; la generación de imágenes por API exige activar la facturación en Google AI Studio.

   Si una imagen falla, esa diapositiva usa un fondo vectorial de reserva.
5. **Compilar Episodio Completo** → sintetiza las voces con Gemini TTS y graba el vídeo (logo, portada, post-intro, subtítulos, música con auto-ducking y cierre) en `.mp4` (o `.webm` si tu navegador no graba MP4).
6. **Kit SEO** → títulos, descripción con capítulos (con los tiempos reales del vídeo exportado) y etiquetas para YouTube.

> **A tener en cuenta**
> - La grabación es en **tiempo real**: un episodio de 8 minutos tarda unos 8 minutos. Mantén la pestaña visible mientras graba.
> - Con *Gemini API*, cada diapositiva gasta **1 petición de imagen**; cada turno gasta siempre **1 petición de voz**. Las voces se guardan en caché durante la sesión, así que al reintentar solo se piden las que faltan.
> - Las cuotas gratuitas de los modelos de voz e imagen de Gemini son pequeñas y cambian a menudo. Si un modelo no está disponible para tu clave, la app prueba otro de la lista de modelos de tu cuenta y, si no hay ninguno, te dice exactamente qué falla.
> - Usa Chrome o Edge recientes (grabación MP4 con `MediaRecorder`).

---

## 📸 Capturas Visuales y Demostración de Interfaz

### 1. 🎛️ Estudio de Vídeo y Línea de Tiempo Interactiva
```text
+----------------------------------------------------------------------------------------------------+
|  🎙️ NotebookLM Studio | Un Fantasma en el Sistema [unfantasmaenelsistema.com]       ⚙️ API Key  [●] |
+----------------------------------------------------------------------------------------------------+
| [1. Ingesta & Locutores]  [2. Guion Estructurado]  [3. Síntesis & Audio]  [4. Vídeo Final (16:9)]  |
+----------------------------------------------------------------------------------------------------+
|  PREVISUALIZADOR EN VIVO (CANVAS 1280x720)                       CONFIGURACIÓN DE BRANDING         |
|  +-------------------------------------------------------------+ +-------------------------------+ |
|  | [Redes inalámbricas | unfantasmaenelsistema.com] [LOGO]     | | 🎨 Estilo Visual: [Anime ▼]   | |
|  |                                                             | | ⚡ Generar Fondos Anime Lote  | |
|  |     "¿Cómo la IA Agéntica ha revolucionado el hardware?"   | |    [Shinkai] [Cyberpunk]      | |
|  |                                                             | |                               | |
|  |  +---------------------------+ +--------------------------+ | | 🎬 Portada Inicial (Intro)    | |
|  |  | 👤 Alex (Host A) [Habla]  | | 👤 Sam (Host B) [Escucha]| | | ⚡ Post-Intro Cinemática      | |
|  |  |    Ondas de Voz: |||||||  | |    Avatar Reactivo: ( - )| | |    [Optical Flare & Laser ▼]  | |
|  |  +---------------------------+ +--------------------------+ | | 🏁 Pantalla Final (Outro CTA) | |
|  |  [Alex]: "Ya no existe retardo de transcripción, Sam..."    | |                               | |
|  +-------------------------------------------------------------+ | 📦 Exportar Paquete Python    | |
|  [▶ Reproducir]  [00:14 / 01:28] ▬▬▬▬▬▬▬▬▬●▬▬▬▬▬▬▬▬▬ [Vol 100%]  | | 🎬 Compilar Vídeo MP4         | |
+------------------------------------------------------------------+-------------------------------+ |
```

### 2. 🎬 Post-Intro Cinemática con Anamorphic Optical Flare y Haz Láser
```text
+----------------------------------------------------------------------------------------------------+
|                           *       .          *              .               *                      |
|       .               *                 .              *            .                 *            |
|                                                                                                    |
|    ┌──                                                                                      ──┐    |
|       REDES INALÁMBRICAS | UNFANTASMAENELSISTEMA.COM                                              |
|                                                                                                    |
|    ═══════════════════════════════[ ANAMORPHIC OPTICAL FLARE ]════════════════════════════════    |
|                                                                                                    |
|            LA REVOLUCIÓN DE LA INTELIGENCIA ARTIFICIAL AGÉNTICA EN 2026                            |
|             escuchar sin transmitir, y ver mucho más que solo WiFi                                |
|                                                                                                    |
|    └──                                                                                      ──┘    |
|       [ AUDIO SYNTHESIZED SPECTRUM ]  |||||||||||||||||||||||||||||||||||||                        |
+----------------------------------------------------------------------------------------------------+
```

### 3. 💻 Ventana Terminal Enriquecida con Coloreado de Sintaxis
```text
+----------------------------------------------------------------------------------------------------+
|  +----------------------------------------------------------------------------------------------+  |
|  | ● ● ●  user@unfantasma: ~/auditoria_redes                                  [BASH 5.2] [SYS] |  |
|  +----------------------------------------------------------------------------------------------+  |
|  |                                                                                              |  |
|  |  $ airmon-ng start wlan0 --verbose                                                           |  |
|  |    [OK] Interface wlan0 set into monitor mode (mon0)                                         |  |
|  |                                                                                              |  |
|  |  $ kismet -c mon0 --use-gpsd --filter-tracker "bssid=XX:XX:XX"                               |  |
|  |    [*] Initializing wireless passive capture pipeline...                                     |  |
|  |    [!] Warning: High channel congestion detected in 5.8 GHz band                             |  |
|  |    [+] Packets captured: 142,850 | Handshakes captured: 4                                    |  |
|  |                                                                                              |  |
|  |  $ tshark -r capture.pcap -Y "wlan.fc.type_subtype == 0x08" -T fields -e wlan.ssid █         |  |
|  |                                                                                              |  |
+----------------------------------------------------------------------------------------------------+
```

### 4. 📊 Tablas Autoadaptables con Detección de Badges de Protocolo
```text
+----------------------------------------------------------------------------------------------------+
|  MATRIZ COMPARATIVA DE PROTOCOLOS DE SEGURIDAD Y TELEMETRÍA (2026)                                  |
|  +-------------------+----------------------+--------------------+-------------------------------+  |
|  | PROTOCOLO         | CIFRADO / INTEGRIDAD | CONSUMO ESPECTRAL  | ESTADO DE SEGURIDAD           |  |
|  +-------------------+----------------------+--------------------+-------------------------------+  |
|  | WPA3-Enterprise   | AES-GCM-256 (CNSA)   | Bajo (OFDMA)       | [✓ SEGURO] Robusto / PMF      |  |
|  | WPA2-Personal     | CCMP / TKIP          | Medio (Legacy)     | [!] VULNERABLE a Deauth       |  |
|  | OWE (Enhanced)    | Diffie-Hellman 19    | Óptimo (Open WiFi) | [✓ PROTEGIDO] Sin Passphrase  |  |
|  | BLE Mesh 2.0      | Two-Level AES-128    | Ultrabajo (IoT)    | [✓ SEGURO] Replay-Protected   |  |
|  +-------------------+----------------------+--------------------+-------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

### 5. 🛡️ Consola de Auditoría y Validación de Assets del Paquete Python
```text
+----------------------------------------------------------------------------------------------------+
| [10:28:15] [PASS] SCRIPT   Guion final validado: "El Salto Agéntico 2026" (7 turnos, 480 palabras) |
| [10:28:16] [PASS] AUDIO    Pista Turno 1 [Host_A]: turn_0_Host_A.wav (182 KB, voz Puck HD)         |
| [10:28:17] [PASS] AUDIO    Pista Turno 2 [Host_B]: turn_1_Host_B.wav (145 KB, voz Kore HD)         |
| [10:28:18] [PASS] IMAGES   Fondo anime Turno 1: turn_0.svg generado (Makoto Shinkai Twilight)     |
| [10:28:19] [PASS] IMAGES   Fondo terminal Turno 2: turn_1.svg generado (Cyberpunk HUD Grid)         |
| [10:28:20] [PASS] SCRIPT   Subtítulos .SRT sincronizados generados con timestamps precisos         |
| [10:28:21] [PASS] CODE     Módulos Python autónomos validados (app.py, video_engine.py, MoviePy)   |
| [10:28:22] [PASS] PACKAGE  Watermark de logo integrado: icono.png (67 KB)                          |
| [10:28:23] [PASS] PACKAGE  ✨ Paquete validado al 100%: 7 audios, 7 fondos, script.json (1.82 MB)  |
+----------------------------------------------------------------------------------------------------+
```

---

## 🚀 Las 4 Nuevas Mejoras Integradas

1. **Integración Directa de las Voces de los Locutores en el Vídeo Exportado (`.mp4`)**:
   - Compilación con Web Audio API mediante un nodo `MediaStreamDestination`.
   - Mezcla en tiempo real de las voces sintetizadas para cada locutor, música de fondo (BGM) ambiental, auto-ducking inteligente que atenúa la música mientras los anfitriones hablan, y efectos de sonido (SFX) para intro y outro.
2. **Diseño Enriquecido de Terminal y Tablas Autoadaptables**:
   - Terminal interactiva estilo macOS/Linux con botones de control en semáforo, ruta de usuario activa, coloreado de sintaxis (comandos en verde/cian, flags en ámbar, rutas en violeta, comentarios en pizarra) y cursor parpadeante dinámico.
   - Tablas comparativas autoadaptables con cálculo dinámico del ancho de columnas, encabezados en vidrio esmerilado con degradados y detección automática de píldoras de estado (`[✓ SEGURO]`, `[!] CRÍTICO`).
3. **Generación Automática en Lote de Fondos Anime Consistentes**:
   - Selector temático de estética visual: *Shinkai Twilight* (atardecer violeta y estrellas celestiales), *Cyberpunk Neo-Tokyo* (neón fucsia y horizontes oscuros) y *Ghibli Tech Garden* (verdes suaves y cielos cálidos).
   - Generación simultánea para todos los turnos del guion con persistencia y sin diapositivas vacías.
4. **Animación Cinemática Avanzada para la Post-Intro del Título**:
   - Efecto de destello anamórfico (*Optical Flare*) con haz láser horizontal, partículas celestiales y retícula HUD táctica militar.
   - Tipografía cinética con escalado 3D, soporte para categoría temática de cabecera y subtítulo en verde esmeralda.

---

## 📦 Protocolo de Validación de Assets para el Paquete Python

Al exportar el proyecto para ejecución local, el sistema ejecuta un **protocolo de validación paso a paso** para garantizar que ningún asset falte antes de descargar:

```text
notebooklm_youtube_studio.zip
├── app.py                      # Interfaz gráfica Streamlit lista para ejecución
├── generator.py                # Módulo de guiones con Google GenAI SDK
├── tts_engine.py               # Motor desacoplado Edge-TTS / ElevenLabs
├── video_engine.py             # Ensamblador MoviePy con watermark sin distorsión
├── requirements.txt            # Dependencias oficiales sin conflictos
├── README.md                   # Documentación técnica de ejecución local
├── config.json                 # Metadatos del estudio, locutores y enlaces
├── script.json                 # Guion estructurado final de la sesión actual
├── subtitles.srt               # Subtítulos con marcas de tiempo sincronizadas
├── icono.png                   # Watermark oficial sin distorsión
└── assets/
    ├── icono.png               # Copia en carpeta de recursos
    ├── audio/
    │   ├── audio_manifest.json # Metadatos de pistas, duración y locutores
    │   ├── turn_0_Host_A.wav   # Audio sintetizado Turno 1
    │   ├── turn_1_Host_B.wav   # Audio sintetizado Turno 2
    │   └── ...
    └── backgrounds/
        ├── manifest.json       # Registro de estilos y temas por turno
        ├── default_bg.svg      # Fondo de respaldo
        ├── turn_0.svg / .png   # Fondo ilustrado Anime Turno 1
        ├── turn_1.svg / .png   # Fondo ilustrado Anime Turno 2
        └── ...
```

---

## 🛠️ Instalación y Puesta en Marcha

### Opción A: Aplicación web (React + Vite, sin servidor)

Requiere [Bun](https://bun.sh/).

```bash
git clone https://github.com/jpm70/NotebookLM-Studio.git
cd NotebookLM-Studio
bun install
bun run dev
```

Abre `http://localhost:3000` y configura tu clave desde **Configurar API Key**. No hace falta ningún `.env`: la clave nunca se compila dentro de la app.

**Despliegue:** cada push a `main` lo publica en GitHub Pages con el workflow `.github/workflows/deploy.yml` (Bun → `bun run build` con `GITHUB_PAGES=true`, que ajusta la ruta base a `/NotebookLM-Studio/`).

### Opción B: Motor Autónomo en Python / Streamlit (Local)

El proyecto incluye la carpeta `python_app/` y permite descargar el paquete `.zip` autovalidado.

#### 1. Entrar en la carpeta de Python
```bash
cd python_app
# O descomprime el bundle descargado:
# unzip notebooklm_studio_bundle.zip && cd notebooklm_youtube_studio
```

#### 2. Crear entorno virtual
```bash
python -m venv venv
# En Linux / macOS:
source venv/bin/activate
# En Windows:
venv\Scripts\activate
```

#### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

> **Nota sobre FFmpeg**: MoviePy requiere FFmpeg para compilar audio y vídeo. Si no lo tienes en tu sistema, instálalo con `sudo apt install ffmpeg` (Ubuntu/Debian), `brew install ffmpeg` (macOS) o descargando el binario en Windows.

#### 4. Ejecutar la aplicación
```bash
streamlit run app.py
```
La aplicación detectará automáticamente `script.json`, `subtitles.srt` y los assets de audio e imágenes empaquetados.

---

## 🌐 Arquitectura del Sistema

```mermaid
graph TD
    A[Artículo HTML / Documento] --> B[Article Parser & Text Ingestion]
    B --> C[Gemini texto · desde el navegador]
    C --> D[Guion Estructurado: DialogueTurn JSON]
    D --> E1[Voces: Gemini TTS · PCM → WAV]
    D --> E2[Fondos: gratis · manual con Gemini · Gemini API · SVG de reserva]
    D --> E3[Subtitle Generator: SRT & Timestamps]
    E1 --> F1[Video Canvas Renderer: 16:9 & 9:16]
    E2 --> F1
    E3 --> F1
    F1 --> G1[Exportación Directa Vídeo MP4 con Audio]
    D --> H1[Asset Validation Engine]
    E1 --> H1
    E2 --> H1
    E3 --> H1
    H1 --> I1[Paquete Autónomo Python .ZIP con Assets]
    I1 --> J1[Streamlit + MoviePy Renderizado Local]
```


## 📄 Licencia

Este proyecto está distribuido bajo la licencia **MIT**. Consulta el archivo `LICENSE` para más información.

Desarrollado con dedicación por **Un Fantasma en el Sistema** ([www.unfantasmaenelsistema.com](https://www.unfantasmaenelsistema.com/)).
