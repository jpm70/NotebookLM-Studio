"""
Módulo de Ensamblado de Vídeo (Video Assembly Engine)
Compila pistas de audio, transiciones, avatares reactivos,
subtítulos dinámicos, watermark de logo sin distorsión,
portada inicial (intro) y pantalla de cierre (outro).
"""

import os
import math
import logging
from typing import List, Dict, Any, Optional
import numpy as np
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger("video_engine")

try:
    from moviepy.editor import (
        AudioFileClip,
        VideoClip,
        CompositeVideoClip,
        ColorClip,
        ImageClip,
        concatenate_videoclips
    )
except ImportError:
    try:
        from moviepy import (
            AudioFileClip,
            VideoClip,
            CompositeVideoClip,
            ColorClip,
            ImageClip,
            concatenate_videoclips
        )
    except ImportError:
        logger.warning("MoviePy no está instalado. Ejecuta: pip install moviepy")
        AudioFileClip = None
        VideoClip = None
        concatenate_videoclips = None


def get_default_font(size: int = 32):
    """Carga una fuente legible predeterminada o fallback del sistema."""
    font_candidates = [
        "DejaVuSans-Bold.ttf",
        "DejaVuSans.ttf",
        "Arial.ttf",
        "Helvetica.ttf",
        "Roboto-Medium.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "C:\\Windows\\Fonts\\arial.ttf"
    ]
    for candidate in font_candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except Exception:
            continue
    return ImageFont.load_default()


def load_logo_image(logo_path: Optional[str] = None) -> Optional[Image.Image]:
    """Carga y valida la imagen del logo asegurando modo RGBA."""
    if not logo_path or not os.path.exists(logo_path):
        return None
    try:
        img = Image.open(logo_path)
        return img.convert("RGBA")
    except Exception as e:
        logger.warning(f"No se pudo cargar la imagen del logo desde {logo_path}: {e}")
        return None


def apply_logo_watermark(
    base_img: Image.Image,
    logo_img: Optional[Image.Image],
    position: str = "top-right",
    scale_percent: int = 14,
    opacity: float = 0.85
) -> Image.Image:
    """
    Superpone el logo en la esquina seleccionada SIN DISTORSIÓN (preservando su ratio natural).
    """
    if logo_img is None:
        return base_img

    width, height = base_img.size
    max_dim = int(min(width, height) * (scale_percent / 100.0))

    # Calcular dimensiones manteniendo el aspect ratio original del logo
    lw, lh = logo_img.size
    aspect = lw / float(lh) if lh > 0 else 1.0

    draw_w = max_dim
    draw_h = int(draw_w / aspect)
    if draw_h > max_dim:
        draw_h = max_dim
        draw_w = int(draw_h * aspect)

    resized_logo = logo_img.resize((draw_w, draw_h), Image.Resampling.LANCZOS)

    # Ajustar opacidad si es menor a 1.0
    if opacity < 1.0:
        r, g, b, alpha = resized_logo.split()
        alpha = alpha.point(lambda p: int(p * opacity))
        resized_logo.putalpha(alpha)

    margin = int(min(width, height) * 0.035)

    if position == "top-left":
        x = margin
        y = margin
    elif position == "top-right":
        x = width - margin - draw_w
        y = margin
    elif position == "bottom-left":
        x = margin
        y = height - margin - draw_h
    else:  # bottom-right
        x = width - margin - draw_w
        y = height - margin - draw_h

    # Fondo redondeado sutil
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw_ov = ImageDraw.Draw(overlay)
    draw_ov.rounded_rectangle([x - 6, y - 6, x + draw_w + 6, y + draw_h + 6], radius=8, fill=(15, 23, 42, 100))

    overlay.paste(resized_logo, (x, y), resized_logo)
    return Image.alpha_composite(base_img.convert("RGBA"), overlay).convert("RGB")


def draw_intro_frame(
    t: float,
    width: int,
    height: int,
    episode_title: str,
    intro_subtitle: str,
    host_a: dict,
    host_b: dict,
    logo_img: Optional[Image.Image] = None
) -> np.ndarray:
    """Renderiza el cuadro para la Portada / Intro inicial."""
    img = Image.new("RGBA", (width, height), (2, 6, 23, 255))
    draw = ImageDraw.Draw(img)

    # Fondo con degradado
    for y in range(0, height, 4):
        f = y / float(height)
        r = int(2 + 13 * f)
        g = int(6 + 17 * f)
        b = int(23 + 45 * f)
        draw.rectangle([(0, y), (width, y + 4)], fill=(r, g, b, 255))

    font_badge = get_default_font(size=int(height * 0.022))
    font_title = get_default_font(size=int(height * 0.040))
    font_sub = get_default_font(size=int(height * 0.024))

    # Badge superior
    draw.text((width // 2, int(height * 0.12)), "🎙️ UN FANTASMA EN EL SISTEMA PRESENTA", fill=(245, 158, 11), font=font_badge, anchor="mm")

    # Logo central sin distorsión
    if logo_img:
        logo_size = int(height * 0.32)
        lw, lh = logo_img.size
        aspect = lw / float(lh) if lh > 0 else 1.0
        draw_w = logo_size
        draw_h = int(draw_w / aspect)
        if draw_h > logo_size:
            draw_h = logo_size
            draw_w = int(draw_h * aspect)

        res_logo = logo_img.resize((draw_w, draw_h), Image.Resampling.LANCZOS)
        img.paste(res_logo, (width // 2 - draw_w // 2, int(height * 0.32) - draw_h // 2), res_logo)

    # Título del episodio
    draw.text((width // 2, int(height * 0.58)), episode_title[:55], fill=(255, 255, 255), font=font_title, anchor="mm")
    draw.text((width // 2, int(height * 0.65)), intro_subtitle[:70], fill=(148, 163, 184), font=font_sub, anchor="mm")

    # Voces
    tag_text = f"Anfitriones: {host_a.get('name', 'Alex')} & {host_b.get('name', 'Sam')} • www.unfantasmaenelsistema.com"
    draw.text((width // 2, int(height * 0.84)), tag_text, fill=(245, 158, 11), font=font_sub, anchor="mm")

    return np.array(img.convert("RGB"))


def draw_outro_frame(
    t: float,
    width: int,
    height: int,
    episode_title: str,
    outro_title: str,
    website_url: str,
    logo_img: Optional[Image.Image] = None
) -> np.ndarray:
    """Renderiza el cuadro para la Pantalla Final / Outro."""
    img = Image.new("RGBA", (width, height), (9, 13, 22, 255))
    draw = ImageDraw.Draw(img)

    for y in range(0, height, 4):
        f = y / float(height)
        r = int(9 + 6 * f)
        g = int(13 + 10 * f)
        b = int(22 + 20 * f)
        draw.rectangle([(0, y), (width, y + 4)], fill=(r, g, b, 255))

    font_title = get_default_font(size=int(height * 0.042))
    font_sub = get_default_font(size=int(height * 0.024))
    font_btn = get_default_font(size=int(height * 0.022))

    # Logo central
    if logo_img:
        logo_size = int(height * 0.30)
        lw, lh = logo_img.size
        aspect = lw / float(lh) if lh > 0 else 1.0
        draw_w = logo_size
        draw_h = int(draw_w / aspect)
        if draw_h > logo_size:
            draw_h = logo_size
            draw_w = int(draw_h * aspect)

        res_logo = logo_img.resize((draw_w, draw_h), Image.Resampling.LANCZOS)
        img.paste(res_logo, (width // 2 - draw_w // 2, int(height * 0.30) - draw_h // 2), res_logo)

    draw.text((width // 2, int(height * 0.54)), outro_title, fill=(255, 255, 255), font=font_title, anchor="mm")
    draw.text((width // 2, int(height * 0.62)), "Suscríbete al canal y activa las notificaciones", fill=(148, 163, 184), font=font_sub, anchor="mm")

    # Tarjeta web
    card_w = min(int(width * 0.8), 540)
    card_h = int(height * 0.08)
    cx1 = width // 2 - card_w // 2
    cy1 = int(height * 0.70)
    draw.rounded_rectangle([cx1, cy1, cx1 + card_w, cy1 + card_h], radius=12, fill=(245, 158, 11, 30), outline=(245, 158, 11), width=2)
    draw.text((width // 2, cy1 + card_h // 2), f"🌐 {website_url}", fill=(245, 158, 11), font=font_sub, anchor="mm")

    # Botón Suscríbete
    btn_w = 260
    btn_h = int(height * 0.06)
    bx1 = width // 2 - btn_w // 2
    by1 = int(height * 0.84)
    draw.rounded_rectangle([bx1, by1, bx1 + btn_w, by1 + btn_h], radius=20, fill=(239, 68, 68), outline=(255, 255, 255), width=2)
    draw.text((width // 2, by1 + btn_h // 2), "▶ SUSCRÍBETE", fill=(255, 255, 255), font=font_btn, anchor="mm")

    return np.array(img.convert("RGB"))


def draw_dialogue_frame(
    t: float,
    width: int,
    height: int,
    aspect_ratio: str,
    segments: list,
    turns_data: list,
    host_a: dict,
    host_b: dict,
    episode_title: str,
    logo_img: Optional[Image.Image] = None,
    logo_position: str = "top-right",
    logo_scale: int = 14,
    logo_opacity: float = 0.85
) -> np.ndarray:
    """Renderiza el cuadro de diálogo estándar durante la conversación."""
    active_seg = None
    active_turn = None
    for idx, seg in enumerate(segments):
        start = getattr(seg, "start_time", 0.0)
        end = getattr(seg, "end_time", 0.0)
        if start <= t <= end:
            active_seg = seg
            if idx < len(turns_data):
                active_turn = turns_data[idx]
            break

    speaker_is_a = True
    current_emotion = "conversacional"
    current_text = ""
    current_visual_title = episode_title

    if active_turn:
        spk = getattr(active_turn, "speaker", "Host_A")
        speaker_is_a = (spk == "Host_A")
        current_emotion = getattr(active_turn, "emotion", "reflexivo")
        current_text = getattr(active_turn, "text", "")
        current_visual_title = getattr(active_turn, "visual_title", episode_title)
    elif active_seg:
        speaker_is_a = (getattr(active_seg, "speaker", "Host_A") == "Host_A")

    img = Image.new("RGBA", (width, height), (15, 23, 42, 255))
    draw = ImageDraw.Draw(img)

    for y in range(0, height, 4):
        f = y / float(height)
        r = int(20 + (7 - 20) * f)
        g = int(24 + (10 - 24) * f)
        b = int(38 + (19 - 38) * f)
        draw.rectangle([(0, y), (width, y + 4)], fill=(r, g, b, 255))

    is_vertical = (aspect_ratio == "9:16")

    font_badge = get_default_font(size=int(height * 0.022))
    font_title = get_default_font(size=int(height * 0.034))
    font_sub = get_default_font(size=int(height * 0.026))

    # Badge superior
    badge_text = "🎙️ NOTEBOOKLM AUDIO OVERVIEW"
    draw.text((width // 2, int(height * 0.05)), badge_text, fill=(245, 158, 11, 230), font=font_badge, anchor="mm")
    draw.text((width // 2, int(height * 0.10)), current_visual_title[:45], fill=(255, 255, 255, 255), font=font_title, anchor="mm")

    avatar_radius = int(width * 0.09) if not is_vertical else int(width * 0.16)
    pulse = math.sin(t * 8) * 4 if active_seg else 0

    if not is_vertical:
        a_center = (int(width * 0.28), int(height * 0.42))
        b_center = (int(width * 0.72), int(height * 0.42))
    else:
        a_center = (int(width * 0.30), int(height * 0.32))
        b_center = (int(width * 0.70), int(height * 0.32))

    _draw_host_avatar(draw, a_center, avatar_radius, host_a.get("name", "Alex"), (speaker_is_a and active_seg is not None), pulse if speaker_is_a else 0, (59, 130, 246), font_sub)
    _draw_host_avatar(draw, b_center, avatar_radius, host_b.get("name", "Sam"), ((not speaker_is_a) and active_seg is not None), pulse if not speaker_is_a else 0, (245, 158, 11), font_sub)

    wave_y = int(height * 0.62) if not is_vertical else int(height * 0.50)
    _draw_waveform(draw, width, wave_y, t, is_active=(active_seg is not None), is_vertical=is_vertical)

    card_top = int(height * 0.71) if not is_vertical else int(height * 0.60)
    card_bot = int(height * 0.94) if not is_vertical else int(height * 0.92)
    card_margin = int(width * 0.08) if not is_vertical else int(width * 0.05)

    _draw_subtitle_card(draw, (card_margin, card_top, width - card_margin, card_bot), host_a.get("name", "Alex") if speaker_is_a else host_b.get("name", "Sam"), current_emotion, current_text, speaker_is_a, width, height)

    # Superponer logo sin distorsionar
    if logo_img:
        img = apply_logo_watermark(img, logo_img, position=logo_position, scale_percent=logo_scale, opacity=logo_opacity)

    return np.array(img.convert("RGB"))


def _draw_host_avatar(draw, center, radius, name, is_active, pulse, color, font):
    cx, cy = center
    r = int(radius + pulse)
    if is_active:
        draw.ellipse([cx - r - 10, cy - r - 10, cx + r + 10, cy + r + 10], fill=(*color, 70))
        draw.ellipse([cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4], outline=(255, 255, 255, 240), width=3)
    else:
        draw.ellipse([cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2], outline=(71, 85, 105, 180), width=2)

    fill_bg = (30, 41, 59) if not is_active else (color[0] // 3, color[1] // 3, color[2] // 3)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill_bg)
    font_init = get_default_font(size=int(r * 0.9))
    draw.text((cx, cy), name[:1].upper() if name else "H", fill=(255, 255, 255, 250), font=font_init, anchor="mm")
    draw.text((cx, cy + r + 18), name, fill=(255, 255, 255) if is_active else (148, 163, 184), font=font, anchor="mm")


def _draw_waveform(draw, width, y_center, t, is_active, is_vertical):
    num_bars = 36 if not is_vertical else 24
    spacing = width / (num_bars + 1)
    for i in range(num_bars):
        x = spacing * (i + 1)
        amp = math.sin(t * 12 + i * 0.5) * math.cos(t * 6 + i * 0.8) if is_active else 0
        h = max(6, abs(amp) * 36 + 10) if is_active else 4
        color = (245, 158, 11) if i % 2 == 0 else (59, 130, 246)
        draw.line([(x, y_center - h / 2), (x, y_center + h / 2)], fill=color, width=3)


def _draw_subtitle_card(draw, box, speaker_name, emotion, text, speaker_is_a, width, height):
    x1, y1, x2, y2 = box
    draw.rectangle([x1, y1, x2, y2], fill=(15, 23, 42, 220), outline=(51, 65, 85, 200), width=2)
    badge_bg = (59, 130, 246, 60) if speaker_is_a else (245, 158, 11, 60)
    badge_border = (59, 130, 246, 220) if speaker_is_a else (245, 158, 11, 220)
    draw.rectangle([x1 + 16, y1 + 12, x1 + 220, y1 + 44], fill=badge_bg, outline=badge_border, width=1)
    font_tag = get_default_font(size=int(height * 0.020))
    draw.text((x1 + 24, y1 + 28), f"{speaker_name} • [{emotion}]", fill=(255, 255, 255), font=font_tag, anchor="lm")

    font_text = get_default_font(size=int(height * 0.024))
    words = text.split()
    lines = []
    curr = []
    max_c = 54 if width > height else 32
    for w in words:
        if len(" ".join(curr + [w])) <= max_c:
            curr.append(w)
        else:
            lines.append(" ".join(curr))
            curr = [w]
    if curr:
        lines.append(" ".join(curr))

    start_y = y1 + 58
    for line in lines[:4]:
        draw.text((x1 + 20, start_y), line, fill=(241, 245, 249), font=font_text)
        start_y += int(height * 0.038)


def render_full_video(
    audio_path: str,
    segments: list,
    turns_data: list,
    host_a: dict,
    host_b: dict,
    episode_title: str,
    output_video_path: str,
    aspect_ratio: str = "16:9",
    fps: int = 24,
    logo_path: Optional[str] = None,
    logo_position: str = "top-right",
    logo_scale: int = 14,
    logo_opacity: float = 0.85,
    include_intro: bool = True,
    intro_duration: float = 3.0,
    intro_subtitle: str = "Podcast producido por Un Fantasma en el Sistema",
    include_outro: bool = True,
    outro_duration: float = 3.0,
    outro_title: str = "¡Gracias por acompañarnos!",
    website_url: str = "https://www.unfantasmaenelsistema.com/",
    progress_callback=None
) -> str:
    """
    Compila el vídeo completo con MoviePy:
    - Portada inicial (si está activa)
    - Pista de podcast con diálogos y ondas reactivas
    - Watermark de logo sin distorsión
    - Pantalla final de cierre (si está activa)
    """
    if AudioFileClip is None or VideoClip is None:
        raise ImportError("MoviePy no está instalado adecuadamente en este entorno.")

    width, height = (720, 1280) if aspect_ratio == "9:16" else (1280, 720)
    logo_img = load_logo_image(logo_path)

    clips = []

    # 1. Portada / Intro
    if include_intro and intro_duration > 0:
        logger.info(f"Generando clip de portada ({intro_duration}s)...")
        intro_clip = VideoClip(
            lambda t: draw_intro_frame(t, width, height, episode_title, intro_subtitle, host_a, host_b, logo_img),
            duration=intro_duration
        )
        clips.append(intro_clip)

    # 2. Diálogo Principal
    logger.info(f"Cargando audio desde: {audio_path}")
    audio_clip = AudioFileClip(audio_path)
    main_duration = audio_clip.duration

    main_clip = VideoClip(
        lambda t: draw_dialogue_frame(
            t, width, height, aspect_ratio, segments, turns_data, host_a, host_b, episode_title,
            logo_img=logo_img, logo_position=logo_position, logo_scale=logo_scale, logo_opacity=logo_opacity
        ),
        duration=main_duration
    ).set_audio(audio_clip)
    clips.append(main_clip)

    # 3. Pantalla Final / Outro
    if include_outro and outro_duration > 0:
        logger.info(f"Generando clip de outro ({outro_duration}s)...")
        outro_clip = VideoClip(
            lambda t: draw_outro_frame(t, width, height, episode_title, outro_title, website_url, logo_img),
            duration=outro_duration
        )
        clips.append(outro_clip)

    # Concatenar todos los clips
    if len(clips) > 1 and concatenate_videoclips is not None:
        final_video = concatenate_videoclips(clips, method="compose")
    else:
        final_video = clips[0]

    os.makedirs(os.path.dirname(output_video_path), exist_ok=True)
    logger.info(f"Escribiendo archivo de vídeo final en: {output_video_path}")

    final_video.write_videofile(
        output_video_path,
        fps=fps,
        codec="libx264",
        audio_codec="aac",
        preset="fast",
        threads=4,
        logger=None
    )

    audio_clip.close()
    final_video.close()
    return output_video_path
