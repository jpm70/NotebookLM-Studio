"""
Módulo de Síntesis de Voz (TTS Engine Desacoplado)
Soporta:
1. edge-tts (Local / Gratuito / Voces Neuronales Microsoft de alta calidad con timestamps)
2. ElevenLabs API (Opcional mediante API Key)
"""

import os
import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger("tts_engine")

# Voces recomendadas de Edge-TTS clasificadas por registro y acento regional
EDGE_TTS_VOICES = {
    "es-ES-AlvaroNeural": "🇪🇸 Español (España) - Álvaro (Barítono, Natural)",
    "es-ES-ElviraNeural": "🇪🇸 Español (España) - Elvira (Mezzosoprano, Expresiva)",
    "es-MX-JorgeNeural": "🇲🇽 Español (México) - Jorge (Barítono Cálido Latino)",
    "es-MX-DaliaNeural": "🇲🇽 Español (México) - Dalia (Soprano Suave Panamericana)",
    "es-AR-TomasNeural": "🇦🇷 Español (Argentina) - Tomás (Tenor Rioplatense)",
    "es-CO-SalomeNeural": "🇨🇴 Español (Colombia) - Salomé (Mezzosoprano Andina)",
    "es-CO-GonzaloNeural": "🇨🇴 Español (Colombia) - Gonzalo (Barítono Neutro)",
    "en-US-GuyNeural": "🇺🇸 Inglés (EE. UU.) - Guy (Masculino, Conversacional)",
    "en-US-JennyNeural": "🇺🇸 Inglés (EE. UU.) - Jenny (Femenino, Dinámica)",
    "en-US-AriaNeural": "🇺🇸 Inglés (EE. UU.) - Aria (Femenino, Periodística)",
}

@dataclass
class AudioTurnSegment:
    turn_index: int
    speaker: str
    audio_path: str
    duration_seconds: float
    start_time: float
    end_time: float
    subtitles_vtt_path: Optional[str] = None


class BaseTTSEngine:
    """Clase base abstracta para motores de síntesis de voz."""
    async def synthesize_turn(self, text: str, voice: str, output_path: str) -> float:
        raise NotImplementedError

    def get_available_voices(self) -> Dict[str, str]:
        raise NotImplementedError


class EdgeTTSEngine(BaseTTSEngine):
    """Implementación de TTS usando Microsoft Edge TTS (Gratis, rápido, multilingüe)."""

    def __init__(self):
        try:
            import edge_tts
            self.edge_tts = edge_tts
        except ImportError:
            self.edge_tts = None
            logger.warning("edge-tts no está instalado. Ejecuta: pip install edge-tts")

    def get_available_voices(self) -> Dict[str, str]:
        return EDGE_TTS_VOICES

    async def synthesize_turn(
        self,
        text: str,
        voice: str,
        output_path: str,
        rate: str = "+0%",
        pitch: str = "+0Hz"
    ) -> float:
        if self.edge_tts is None:
            raise ImportError("edge-tts no está disponible. Instálalo con 'pip install edge-tts'.")

        vtt_path = output_path.replace(".mp3", ".vtt")
        communicate = self.edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch)
        submaker = self.edge_tts.SubMaker()

        with open(output_path, "wb") as file:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    file.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    submaker.feed(chunk)

        # Guardar subtítulos sincronizados si se generaron marcas
        try:
            with open(vtt_path, "w", encoding="utf-8") as vtt_file:
                vtt_file.write(submaker.get_vtt())
        except Exception as e:
            logger.warning(f"No se pudieron generar subtítulos VTT: {e}")

        # Calcular duración exacta del archivo de audio generado
        duration = self._get_audio_duration(output_path)
        return duration

    def _get_audio_duration(self, audio_path: str) -> float:
        """Obtiene la duración en segundos usando mutagen o pydub o fallback ffmpeg."""
        try:
            import mutagen
            audio_info = mutagen.File(audio_path)
            if audio_info and audio_info.info:
                return float(audio_info.info.length)
        except Exception:
            pass

        try:
            from pydub import AudioSegment
            seg = AudioSegment.from_file(audio_path)
            return len(seg) / 1000.0
        except Exception:
            pass

        # Estimación heurística de fallback: ~140 palabras por minuto
        # si no hay bibliotecas multimedia adicionales
        file_size = os.path.getsize(audio_path)
        # MP3 típico a 128kbps ~ 16000 bytes/seg
        estimated = max(1.0, file_size / 16000.0)
        return estimated


class ElevenLabsTTSEngine(BaseTTSEngine):
    """Implementación de TTS usando ElevenLabs API (Requiere clave de API de ElevenLabs)."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY")

    def get_available_voices(self) -> Dict[str, str]:
        return {
            "21m00Tcm4TlvDq8ikWAM": "Rachel (Calm & Professional)",
            "AZnzlk1XvdvUeBnXmlld": "Domi (Strong & Energetic)",
            "EXAVITQu4vr4xnSDxMaL": "Bella (Soft & Natural)",
            "ErXwobaYiN019PkySvjV": "Antoni (Friendly & Storyteller)",
            "VR6AewLTigWG4xSOukaG": "Arnold (Deep & Resonant)",
            "pNInz6obpgDQGcFmaJgB": "Adam (Clear & Narrator)",
        }

    async def synthesize_turn(self, text: str, voice: str, output_path: str) -> float:
        if not self.api_key:
            raise ValueError("Se requiere una API Key de ElevenLabs para usar este motor.")

        try:
            import httpx
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}"
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.api_key
            }
            payload = {
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            }
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code != 200:
                    raise RuntimeError(f"Error ElevenLabs ({res.status_code}): {res.text}")
                with open(output_path, "wb") as f:
                    f.write(res.content)

            edge_helper = EdgeTTSEngine()
            return edge_helper._get_audio_duration(output_path)
        except Exception as e:
            logger.error(f"Error sintetizando con ElevenLabs: {e}")
            raise RuntimeError(f"Fallo en síntesis con ElevenLabs: {e}")


def synthesize_full_podcast(
    turns: list,
    voice_a: str,
    voice_b: str,
    output_dir: str,
    engine_type: str = "edge-tts",
    elevenlabs_api_key: Optional[str] = None,
    pause_between_speakers_sec: float = 0.3
) -> Tuple[str, List[AudioTurnSegment], float]:
    """
    Sintetiza secuencialmente todos los turnos del guion,
    inserta pausas naturales (0.2s - 0.4s) entre turnos
    y genera la pista de audio consolidada con sus metadatos de sincronización.
    """
    os.makedirs(output_dir, exist_ok=True)

    if engine_type == "elevenlabs" and elevenlabs_api_key:
        engine = ElevenLabsTTSEngine(api_key=elevenlabs_api_key)
    else:
        engine = EdgeTTSEngine()

    segments: List[AudioTurnSegment] = []
    current_time = 0.0

    async def run_batch():
        nonlocal current_time
        for idx, turn in enumerate(turns):
            speaker = getattr(turn, "speaker", "Host_A")
            text = getattr(turn, "text", "")
            voice = voice_a if speaker == "Host_A" else voice_b

            turn_filename = f"turn_{idx+1:03d}_{speaker}.mp3"
            turn_path = os.path.join(output_dir, turn_filename)

            logger.info(f"Sintetizando turno {idx+1}/{len(turns)} ({speaker}): {text[:40]}...")
            duration = await engine.synthesize_turn(text, voice, turn_path)

            start = current_time
            end = start + duration
            vtt_path = turn_path.replace(".mp3", ".vtt")
            vtt_exists = vtt_path if os.path.exists(vtt_path) else None

            segment = AudioTurnSegment(
                turn_index=idx,
                speaker=speaker,
                audio_path=turn_path,
                duration_seconds=duration,
                start_time=start,
                end_time=end,
                subtitles_vtt_path=vtt_exists
            )
            segments.append(segment)

            # Insertar pausa orgánica entre locutores
            current_time = end + pause_between_speakers_sec

    # Ejecutar en loop de asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Soporte cuando se ejecuta en hilos o notebooks
            import nest_asyncio
            nest_asyncio.apply()
            loop.run_until_complete(run_batch())
        else:
            loop.run_until_complete(run_batch())
    except RuntimeError:
        asyncio.run(run_batch())

    # Concatenar todos los audios con pausas de silencio usando pydub o moviepy
    final_audio_path = os.path.join(output_dir, "full_podcast_mix.mp3")
    total_duration = _concatenate_audio_segments(segments, final_audio_path, pause_between_speakers_sec)

    # Generar archivo de subtítulos .SRT sincronizado
    srt_path = os.path.join(output_dir, "podcast_subtitles.srt")
    generate_srt_file(segments, turns, srt_path)

    return final_audio_path, segments, total_duration, srt_path


def format_srt_timestamp(seconds: float) -> str:
    """Convierte segundos a formato estándar SRT (HH:MM:SS,mmm)."""
    total_ms = max(0, int(seconds * 1000))
    hours = total_ms // 3600000
    minutes = (total_ms % 3600000) // 60000
    secs = (total_ms % 60000) // 1000
    ms = total_ms % 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"


def generate_srt_file(
    segments: List[AudioTurnSegment],
    turns_data: list,
    output_srt_path: str,
    intro_offset_sec: float = 0.0
) -> str:
    """
    Genera un archivo de subtítulos .SRT sincronizado con los timestamps del audio
    e introduce el offset de portada/intro si existe.
    """
    with open(output_srt_path, "w", encoding="utf-8") as f:
        for idx, seg in enumerate(segments):
            f.write(f"{idx+1}\n")
            start = seg.start_time + intro_offset_sec
            end = seg.end_time + intro_offset_sec
            f.write(f"{format_srt_timestamp(start)} --> {format_srt_timestamp(end)}\n")
            text = getattr(turns_data[idx], "text", "") if idx < len(turns_data) else ""
            speaker = getattr(turns_data[idx], "speaker", seg.speaker) if idx < len(turns_data) else seg.speaker
            f.write(f"[{speaker}]: {text}\n\n")
    return output_srt_path


def _concatenate_audio_segments(
    segments: List[AudioTurnSegment],
    output_path: str,
    pause_sec: float
) -> float:
    """Une los archivos MP3 insertando silencios de respiración entre cada uno."""
    try:
        from pydub import AudioSegment
        combined = AudioSegment.empty()
        silence = AudioSegment.silent(duration=int(pause_sec * 1000))

        for idx, seg in enumerate(segments):
            turn_audio = AudioSegment.from_file(seg.audio_path)
            combined += turn_audio
            if idx < len(segments) - 1:
                combined += silence

        combined.export(output_path, format="mp3", bitrate="192k")
        return len(combined) / 1000.0

    except ImportError:
        logger.warning("pydub no está disponible. Usando concatenación de emergencia mediante ffmpeg o bytes.")
        # Fallback concatenando directamente
        with open(output_path, "wb") as outfile:
            for seg in segments:
                with open(seg.audio_path, "rb") as infile:
                    outfile.write(infile.read())
        total = sum(s.duration_seconds + pause_sec for s in segments)
        return total
