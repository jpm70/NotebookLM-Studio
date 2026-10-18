"""
NotebookLM Studio to YouTube Video Generator
Aplicación Web en Streamlit con Marca de Agua, Portada y Cierre
Sitio Web Oficial: https://www.unfantasmaenelsistema.com/
"""

import os
import sys
import tempfile
import logging
import streamlit as st
from PIL import Image

# Importaciones modulares locales
from generator import generate_podcast_script, PodcastScript, DialogueTurn
from tts_engine import synthesize_full_podcast, EDGE_TTS_VOICES
from video_engine import render_full_video

st.set_page_config(
    page_title="NotebookLM Studio to YouTube Generator | Un Fantasma en el Sistema",
    page_icon="🎙️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Estilos CSS personalizados
st.markdown("""
<style>
    .brand-header-box {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 18px;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(51, 65, 85, 0.8);
        border-radius: 14px;
        margin-bottom: 20px;
    }
    .brand-title {
        font-size: 1.8rem;
        font-weight: 800;
        background: linear-gradient(90deg, #f59e0b, #ef4444, #3b82f6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
    }
    .brand-link {
        color: #f59e0b;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.85rem;
    }
    .host-card-a {
        border-left: 4px solid #3b82f6;
        padding: 10px 14px;
        background-color: rgba(59, 130, 246, 0.08);
        border-radius: 6px;
        margin-bottom: 12px;
    }
    .host-card-b {
        border-left: 4px solid #f59e0b;
        padding: 10px 14px;
        background-color: rgba(245, 158, 11, 0.08);
        border-radius: 6px;
        margin-bottom: 12px;
    }
</style>
""", unsafe_allow_html=True)

if "podcast_script" not in st.session_state:
    st.session_state.podcast_script = None
if "audio_path" not in st.session_state:
    st.session_state.audio_path = None
if "audio_segments" not in st.session_state:
    st.session_state.audio_segments = None
if "video_path" not in st.session_state:
    st.session_state.video_path = None
if "custom_logo_path" not in st.session_state:
    st.session_state.custom_logo_path = None

# Auto-detección y carga de script.json si se encuentra en la carpeta del paquete
if st.session_state.podcast_script is None and os.path.exists("script.json"):
    try:
        import json
        with open("script.json", "r", encoding="utf-8") as _f_scr:
            _s_data = json.load(_f_scr)
            _turns = [DialogueTurn(**t) for t in _s_data.get("turns", [])]
            st.session_state.podcast_script = PodcastScript(
                episode_title=_s_data.get("episode_title", "Episodio de Podcast"),
                episode_summary=_s_data.get("episode_summary", ""),
                turns=_turns
            )
            logging.info("Auto-cargado script.json empaquetado con éxito.")
    except Exception as _e_scr:
        logging.warning(f"Aviso al auto-cargar script.json: {_e_scr}")

# Auto-detección de subtítulos .SRT y logo
if os.path.exists("subtitles.srt") and "srt_path" not in st.session_state:
    st.session_state.srt_path = "subtitles.srt"

if st.session_state.custom_logo_path is None:
    if os.path.exists("assets/icono.png"):
        st.session_state.custom_logo_path = "assets/icono.png"
    elif os.path.exists("icono.png"):
        st.session_state.custom_logo_path = "icono.png"


def extract_text_from_file(uploaded_file) -> str:
    filename = uploaded_file.name.lower()
    if filename.endswith(".txt") or filename.endswith(".md"):
        return uploaded_file.read().decode("utf-8", errors="ignore")
    elif filename.endswith(".docx"):
        try:
            import zipfile
            import xml.etree.ElementTree as ET
            with zipfile.ZipFile(uploaded_file) as docx_zip:
                xml_content = docx_zip.read('word/document.xml')
                tree = ET.fromstring(xml_content)
                namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                paragraphs = []
                for p in tree.iterfind('.//w:p', namespaces):
                    texts = [node.text for node in p.iterfind('.//w:t', namespaces) if node.text]
                    if texts:
                        paragraphs.append(''.join(texts))
                return "\n\n".join(paragraphs)
        except Exception as e:
            return f"[Error leyendo .docx: {e}]"
    elif filename.endswith(".html") or filename.endswith(".htm"):
        import re
        raw = uploaded_file.read().decode("utf-8", errors="ignore")
        clean = re.sub(r'<(script|style|nav|footer|header)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>', '', raw, flags=re.I)
        clean = re.sub(r'<[^>]+>', ' ', clean)
        return re.sub(r'\s+', ' ', clean).strip()
    elif filename.endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(uploaded_file)
            extracted = [p.extract_text() for p in reader.pages if p.extract_text()]
            return "\n\n".join(extracted)
        except ImportError:
            return uploaded_file.read().decode("utf-8", errors="ignore")
    return ""


def extract_text_from_url(url: str) -> dict:
    """Función auxiliar para extraer título y contenido limpio desde una página web o artículo."""
    import urllib.request
    import re

    clean_url = url.strip()
    if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
        clean_url = "https://" + clean_url

    req = urllib.request.Request(
        clean_url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        }
    )
    with urllib.request.urlopen(req, timeout=12) as resp:
        html_data = resp.read().decode('utf-8', errors='ignore')

    # Extraer título
    title_match = re.search(r'<title[^>]*>(.*?)</title>', html_data, re.I | re.S)
    title = title_match.group(1).strip() if title_match else clean_url

    # Extraer contenido principal si existe article o main
    article_match = re.search(r'<article\b[^>]*>(.*?)</article>', html_data, re.I | re.S)
    main_match = re.search(r'<main\b[^>]*>(.*?)</main>', html_data, re.I | re.S)
    content_html = article_match.group(1) if article_match else (main_match.group(1) if main_match else html_data)

    # Limpiar scripts, estilos y etiquetas
    clean = re.sub(r'<(script|style|nav|footer|header|aside|iframe|svg|form)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>', '', content_html, flags=re.I)
    clean = re.sub(r'<br\s*[\/]?>', '\n', clean)
    clean = re.sub(r'</p>', '\n\n', clean)
    clean = re.sub(r'<[^>]+>', ' ', clean)
    clean = re.sub(r'[ \t]+', ' ', clean)
    lines = [line.strip() for line in clean.split('\n') if line.strip()]
    text = '\n'.join(lines)[:35000]

    return {
        "title": title,
        "text": text,
        "url": clean_url
    }



# ==========================================
# BARRA LATERAL: CONFIGURACIÓN
# ==========================================
with st.sidebar:
    # Logo y Enlace a la web oficial sin distorsión
    st.markdown("""
        <div style="text-align: center; margin-bottom: 15px;">
            <a href="https://www.unfantasmaenelsistema.com/" target="_blank">
                <img src="https://raw.githubusercontent.com/jpm70a/unfantasma/main/icono.png" 
                     onerror="this.src='/logo.svg';"
                     alt="Un Fantasma en el Sistema" 
                     style="width: 85px; height: 85px; object-fit: contain; border-radius: 14px; background: #020617; padding: 6px; border: 1px solid #334155;">
            </a>
            <div style="margin-top: 6px;">
                <a href="https://www.unfantasmaenelsistema.com/" target="_blank" style="color: #f59e0b; text-decoration: none; font-size: 0.85rem; font-weight: 700;">
                    unfantasmaenelsistema.com ↗
                </a>
            </div>
        </div>
    """, unsafe_allow_html=True)

    st.markdown("### ⚙️ Configuración del Estudio")

    api_key_env = os.getenv("GEMINI_API_KEY", "")
    api_key_input = st.text_input(
        "Clave de API de Gemini",
        value=st.session_state.get("gemini_api_key", api_key_env),
        type="password"
    )
    if api_key_input:
        st.session_state.gemini_api_key = api_key_input

    col_k1, col_k2 = st.columns(2)
    with col_k1:
        if st.session_state.get("gemini_api_key"):
            st.success("🟢 Clave activa")
        else:
            st.warning("⚪ Sin clave")
    with col_k2:
        if st.button("Limpiar clave", use_container_width=True):
            st.session_state.gemini_api_key = ""
            st.rerun()

    st.markdown("---")
    st.markdown("#### 🎨 Marca de Agua (Logo en Esquina)")
    enable_logo = st.checkbox("Colocar logo en esquina del vídeo", value=True)
    uploaded_logo = st.file_uploader("Adjuntar logo personalizado (PNG/JPG)", type=["png", "jpg", "jpeg"])
    if uploaded_logo:
        temp_logo = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
        temp_logo.write(uploaded_logo.read())
        temp_logo.close()
        st.session_state.custom_logo_path = temp_logo.name
        st.success("Logo adjunto guardado.")

    logo_corner = st.selectbox(
        "Esquina del vídeo",
        ["Superior Derecha", "Superior Izquierda", "Inferior Derecha", "Inferior Izquierda"],
        index=0
    )
    pos_map = {
        "Superior Derecha": "top-right",
        "Superior Izquierda": "top-left",
        "Inferior Derecha": "bottom-right",
        "Inferior Izquierda": "bottom-left"
    }

    logo_size = st.slider("Tamaño del logo (% del vídeo)", 8, 25, 14)
    logo_opacity = st.slider("Opacidad del logo", 0.3, 1.0, 0.85, 0.05)

    st.markdown("---")
    st.markdown("#### 🎬 Portada e Intro Dinámica")
    include_intro = st.checkbox("Añadir Portada / Intro al inicio", value=True)
    if include_intro:
        intro_sec = st.slider("Duración de Portada (seg)", 2, 6, 3)
        intro_effect = st.selectbox("Efecto visual de intro", ["Zoom Cinemático & Resplandor", "Holograma Neón & Scanlines", "Foco Teatral", "Deslizamiento Minimalista", "Onda de Choque Acústica"])
        intro_subtitle = st.text_input("Subtítulo de portada", value="Un Fantasma en el Sistema presenta")
    else:
        intro_sec = 0
        intro_effect = "Zoom Cinemático & Resplandor"
        intro_subtitle = ""

    include_outro = st.checkbox("Añadir Pantalla Final / Outro al cierre", value=True)
    if include_outro:
        outro_sec = st.slider("Duración de Pantalla Final (seg)", 2, 6, 3)
        outro_effect = st.selectbox("Efecto visual de cierre", ["Alejamiento Cinemático a Negro", "Respiración Neón", "Tarjetas de Suscripción & CTA", "Cierre de Telón"])
        outro_title = st.text_input("Título de cierre", value="¡Gracias por acompañarnos!")
        outro_cta = st.text_input("Llamada a la Acción (CTA)", value="▶ SUSCRÍBETE AL CANAL")
    else:
        outro_sec = 0
        outro_effect = "Alejamiento Cinemático a Negro"
        outro_title = ""
        outro_cta = "▶ SUSCRÍBETE AL CANAL"
    website_url = st.text_input("Enlace web", value="https://www.unfantasmaenelsistema.com/")

    st.markdown("---")
    st.markdown("#### 📺 Formato del Vídeo")
    aspect_ratio = st.radio("Relación de aspecto", ["16:9 (YouTube 1280x720)", "9:16 (Shorts 720x1280)"])
    aspect_code = "16:9" if "16:9" in aspect_ratio else "9:16"
    video_fps = st.select_slider("FPS", options=[20, 24, 30], value=24)

    st.markdown("---")
    st.markdown("#### 🎙️ Perfiles de Locutores")
    with st.expander("👤 Host A (Principal)", expanded=True):
        host_a_name = st.text_input("Nombre Host A", value="Alex")
        host_a_role = st.text_input("Rol Host A", value="Explicador técnico y analítico")
        host_a_tone = st.text_input("Estilo Host A", value="Estructurado y pedagógico")
        voice_a = st.selectbox("Voz (Edge-TTS)", options=list(EDGE_TTS_VOICES.keys()), index=0)

    with st.expander("👤 Host B (Cuestionador)", expanded=True):
        host_b_name = st.text_input("Nombre Host B", value="Sam")
        host_b_role = st.text_input("Rol Host B", value="Curioso, incisivo y conecta con la audiencia")
        host_b_tone = st.text_input("Estilo Host B", value="Espontáneo y ameno")
        voice_b = st.selectbox("Voz (Edge-TTS)", options=list(EDGE_TTS_VOICES.keys()), index=1)

    st.markdown("---")
    language = st.selectbox("Idioma", ["Español", "English", "Português", "Français"], index=0)
    general_tone = st.selectbox("Tono general", ["Divulgativo y ameno", "Debate apasionado", "Académico y técnico"], index=0)
    target_turns = st.slider("Cantidad aproximada de turnos", 6, 20, 10, 2)
    pause_sec = st.slider("Pausa entre interlocutores (seg)", 0.1, 0.8, 0.3, 0.05)


# ==========================================
# ÁREA PRINCIPAL
# ==========================================
st.markdown(f"""
    <div class="brand-header-box">
        <a href="https://www.unfantasmaenelsistema.com/" target="_blank" style="text-decoration: none;">
            <img src="/logo.svg" onerror="this.style.display='none'" style="width: 52px; height: 52px; object-fit: contain; aspect-ratio: 1/1; border-radius: 12px; background: #020617; padding: 4px; border: 1px solid #334155;">
        </a>
        <div>
            <h1 class="brand-title">NotebookLM Studio to YouTube Video Generator</h1>
            <p style="margin: 0; color: #94a3b8; font-size: 0.85rem;">
                Canal Oficial: <a class="brand-link" href="https://www.unfantasmaenelsistema.com/" target="_blank">www.unfantasmaenelsistema.com ↗</a> • Con Portada, Logo en Esquina y Cierre
            </p>
        </div>
    </div>
""", unsafe_allow_html=True)

tab_input, tab_script, tab_audio, tab_video = st.tabs([
    "1. 📥 Ingesta de Documentos",
    "2. 📝 Guion y Edición",
    "3. 🎧 Síntesis de Audio",
    "4. 🎬 Renderizado de Vídeo Final"
])

with tab_input:
    st.markdown("#### Paso 1: Cargar material de origen")
    col_u, col_t = st.columns([1, 1])
    with col_u:
        uploaded_files = st.file_uploader("Subir archivos (PDF, TXT, MD, DOCX, HTML)", type=["pdf", "txt", "md", "docx", "html", "htm"], accept_multiple_files=True)
        file_text = ""
        if uploaded_files:
            for uf in uploaded_files:
                file_text += f"\n--- Archivo: {uf.name} ---\n" + extract_text_from_file(uf)
            st.success(f"Cargados {len(uploaded_files)} archivo(s) con {len(file_text)} caracteres.")
        
        web_url = st.text_input("🔗 O importar directamente desde URL web:", placeholder="https://ejemplo.com/articulo")
        if web_url and st.button("Extraer contenido de URL"):
            with st.spinner("Descargando y procesando contenido web..."):
                try:
                    extracted = extract_text_from_url(web_url)
                    formatted_source = (
                        f"\n=== FUENTE WEB: {extracted['title']} ({extracted['url']}) ===\n"
                        f"{extracted['text']}\n"
                        f"=== FIN FUENTE WEB ===\n"
                    )
                    file_text += formatted_source
                    st.success(f"✓ Contenido extraído de '{extracted['title']}' ({len(extracted['text'])} caracteres) y añadido al contexto de Gemini.")
                except Exception as ex:
                    st.error(f"Error al obtener URL: {ex}")
    with col_t:
        direct_text = st.text_area("O pega el texto / tema aquí:", height=200)

    effective_text = (file_text + "\n\n" + direct_text).strip()

    if st.button("✨ Generar Guion de Podcast con Gemini", type="primary", use_container_width=True):
        if not effective_text or len(effective_text.strip()) < 30:
            st.error("Ingresa al menos 30 caracteres de texto fuente.")
        else:
            with st.spinner("🧠 Generando conversación con Gemini..."):
                try:
                    script = generate_podcast_script(
                        source_text=effective_text,
                        host_a={"name": host_a_name, "role": host_a_role, "tone": host_a_tone},
                        host_b={"name": host_b_name, "role": host_b_role, "tone": host_b_tone},
                        tone=general_tone,
                        language=language,
                        target_turns=target_turns,
                        api_key=st.session_state.get("gemini_api_key")
                    )
                    st.session_state.podcast_script = script
                    st.success("¡Guion generado con éxito! Pasa al Paso 2.")
                except Exception as e:
                    st.error(f"Error: {e}")

with tab_script:
    if st.session_state.podcast_script is None:
        st.info("Primero genera un guion en el Paso 1.")
    else:
        script = st.session_state.podcast_script
        st.markdown(f"### 🎙️ {script.episode_title}")
        st.caption(script.episode_summary)

        # Conteo de palabras y estimación de tiempo total de audio
        total_words = sum(len(t.text.split()) for t in script.turns)
        est_secs = round((total_words / 140) * 60 + len(script.turns) * 0.5)
        m, s = divmod(est_secs, 60)
        st.info(f"📊 **Métricas del Guion:** {total_words:,} palabras totales · ⏱️ **Tiempo estimado de audio:** ~{m} min {s:02d} seg (a 140 ppm) · {len(script.turns)} turnos")
        for i, turn in enumerate(script.turns):
            is_a = (turn.speaker == "Host_A")
            spk_name = host_a_name if is_a else host_b_name
            sfx_info = getattr(turn, 'sfx', None)
            sfx_label = ""
            if sfx_info:
                name = sfx_info.get('name') if isinstance(sfx_info, dict) else getattr(sfx_info, 'name', 'SFX')
                sfx_label = f" • 🎵 SFX: `{name}`"
            st.markdown(f"**Turno {i+1}: {spk_name} ({turn.speaker})** • *[{turn.emotion}]*{sfx_label} — {turn.visual_title}")
            turn.text = st.text_area(f"Texto {i+1}", value=turn.text, key=f"scr_{i}", height=80)

with tab_audio:
    if st.session_state.podcast_script is None:
        st.info("Genera un guion en el Paso 1 primero.")
    else:
        if st.button("🔊 Sintetizar Audio Completo (Edge-TTS)", type="primary", use_container_width=True):
            with st.spinner("Sintetizando voces y uniendo pausas..."):
                temp_dir = tempfile.mkdtemp(prefix="nb_audio_")
                a_path, segs, dur, srt_p = synthesize_full_podcast(
                    turns=st.session_state.podcast_script.turns,
                    voice_a=voice_a,
                    voice_b=voice_b,
                    output_dir=temp_dir,
                    pause_between_speakers_sec=pause_sec
                )
                st.session_state.audio_path = a_path
                st.session_state.audio_segments = segs
                st.session_state.srt_path = srt_p
                st.success(f"Audio sintetizado ({dur:.1f} segundos) y subtítulos .SRT sincronizados.")
        if st.session_state.audio_path:
            st.audio(st.session_state.audio_path)
            if st.session_state.get("srt_path") and os.path.exists(st.session_state.srt_path):
                with open(st.session_state.srt_path, "r", encoding="utf-8") as srt_f:
                    st.download_button(
                        "📥 Descargar Subtítulos (.srt)",
                        data=srt_f.read(),
                        file_name="podcast_subtitles.srt",
                        mime="text/plain"
                    )

with tab_video:
    if not st.session_state.audio_path:
        st.info("Sintetiza el audio en el Paso 3 primero.")
    else:
        st.write(f"Configuración: Vídeo **{aspect_code}**, Portada ({'Sí' if include_intro else 'No'}), Cierre ({'Sí' if include_outro else 'No'}), Logo ({'Sí' if enable_logo else 'No'}).")

        if st.button("🎬 Renderizar Vídeo Final para YouTube", type="primary", use_container_width=True):
            pbar = st.progress(0.0)
            status_text = st.empty()
            status_text.text("Generando cuadros, portada, ondas y cierre...")
            temp_vdir = tempfile.mkdtemp(prefix="nb_vid_")
            out_v = os.path.join(temp_vdir, "youtube_podcast_unfantasma.mp4")

            try:
                final_v = render_full_video(
                    audio_path=st.session_state.audio_path,
                    segments=st.session_state.audio_segments,
                    turns_data=st.session_state.podcast_script.turns,
                    host_a={"name": host_a_name, "role": host_a_role},
                    host_b={"name": host_b_name, "role": host_b_role},
                    episode_title=st.session_state.podcast_script.episode_title,
                    output_video_path=out_v,
                    aspect_ratio=aspect_code,
                    fps=video_fps,
                    logo_path=st.session_state.custom_logo_path if enable_logo else None,
                    logo_position=pos_map[logo_corner],
                    logo_scale=logo_size,
                    logo_opacity=logo_opacity,
                    include_intro=include_intro,
                    intro_duration=float(intro_sec),
                    intro_subtitle=intro_subtitle,
                    include_outro=include_outro,
                    outro_duration=float(outro_sec),
                    outro_title=outro_title,
                    website_url=website_url,
                    progress_callback=lambda p: pbar.progress(p)
                )
                st.session_state.video_path = final_v
                pbar.progress(1.0)
                status_text.success("¡Vídeo renderizado con éxito!")
            except Exception as e:
                st.error(f"Fallo en renderizado: {e}")
                st.exception(e)

        if st.session_state.video_path:
            st.video(st.session_state.video_path)
            with open(st.session_state.video_path, "rb") as f:
                st.download_button("⬇️ Descargar Vídeo (.mp4)", data=f.read(), file_name="unfantasma_youtube_podcast.mp4", mime="video/mp4")
