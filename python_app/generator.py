"""
Módulo Generador de Guiones con Gemini (Google GenAI SDK)
NotebookLM Studio to YouTube Video Generator
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

# Configuración de logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("generator")

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None
    logger.warning("El paquete 'google-genai' no está instalado. Ejecuta: pip install google-genai")


class DialogueTurn(BaseModel):
    speaker: str = Field(
        ...,
        description='Identificador del locutor: exactamente "Host_A" o "Host_B"'
    )
    emotion: str = Field(
        ...,
        description='Emoción predominante del turno: "curioso", "entusiasta", "analítico", "sorprendido", "reflexivo", "humorístico"'
    )
    text: str = Field(
        ...,
        description='Diálogo natural, con muletillas conversacionales, ritmo de podcast y pausas orgánicas'
    )
    visual_title: str = Field(
        ...,
        description='Título conceptual breve (máximo 6 palabras) que aparecerá en pantalla en este fragmento'
    )
    visual_prompt: str = Field(
        ...,
        description='Prompt temático en inglés cinematográfico para generar una imagen o fondo ilustrativo'
    )


class PodcastScript(BaseModel):
    episode_title: str = Field(
        ...,
        description='Título atractivo, clickeable y periodístico para el episodio de YouTube'
    )
    episode_summary: str = Field(
        ...,
        description='Resumen ejecutivo del episodio en 2 o 3 oraciones'
    )
    turns: list[DialogueTurn] = Field(
        ...,
        description='Lista secuencial de turnos de diálogo entre ambos anfitriones'
    )


SYSTEM_PROMPT_TEMPLATE = """Actúa como un productor y guionista de audio senior galardonado, especializado en el formato conversacional de "NotebookLM Audio Overview".
Tu objetivo es transformar el material fuente proporcionado en una conversación de podcast fascinante, espontánea, profunda y entretenida entre dos personalidades contrastantes:

- Host_A ({name_a}): {role_a}. Tono y estilo: {tone_a}.
- Host_B ({name_b}): {role_b}. Tono y estilo: {tone_b}.

REGLAS DE ORO DEL FORMATO:
1. Idioma: {language}.
2. Tono general: {tone_general}.
3. Química y dinamismo: No debe sonar a lectura de un ensayo. Usa muletillas naturales ("mira", "exacto", "totalmente", "espera un segundo", "pero a ver...", "¿de verdad?", "eso es fascinante"), interrupciones amables, anécdotas explicativas y analogías del mundo real.
4. Reparto equitativo: Ambos interlocutores deben participar activamente, alternándose de forma lógica. Uno suele formular la duda o la objeción intuitiva que tendría el espectador, y el otro profundiza con datos y conceptos claros.
5. Sincronización visual: Por cada turno, genera un 'visual_title' impactante de pocas palabras y un 'visual_prompt' descriptivo en inglés enfocado en visualización cinematográfica o infográfica de alta calidad.
6. Cumple estrictamente con el esquema JSON Structured Output proporcionado."""


def create_gemini_client(api_key: Optional[str] = None):
    """Crea e inicializa el cliente de Google GenAI."""
    effective_key = api_key or os.getenv("GEMINI_API_KEY")
    if not effective_key:
        raise ValueError(
            "No se ha encontrado la clave de API de Gemini. "
            "Por favor, ingrésala en la barra lateral o define la variable de entorno GEMINI_API_KEY."
        )
    if genai is None:
        raise ImportError(
            "La biblioteca 'google-genai' no está instalada. Ejecuta 'pip install google-genai'."
        )
    return genai.Client(api_key=effective_key)


def generate_podcast_script(
    source_text: str,
    host_a: Dict[str, str],
    host_b: Dict[str, str],
    tone: str = "Divulgativo y ameno",
    language: str = "Español",
    target_turns: int = 10,
    api_key: Optional[str] = None,
    model_name: str = "gemini-2.5-flash"
) -> PodcastScript:
    """
    Genera un guion estructurado de podcast tipo NotebookLM utilizando Gemini con Structured Outputs.
    """
    if not source_text or len(source_text.strip()) < 20:
        raise ValueError("El texto fuente es demasiado breve. Proporciona al menos 20 caracteres de contenido.")

    client = create_gemini_client(api_key)

    system_instruction = SYSTEM_PROMPT_TEMPLATE.format(
        name_a=host_a.get("name", "Alex"),
        role_a=host_a.get("role", "Explicador técnico"),
        tone_a=host_a.get("tone", "Analítico y pedagógico"),
        name_b=host_b.get("name", "Sam"),
        role_b=host_b.get("role", "Curioso y cuestionador"),
        tone_b=host_b.get("tone", "Espontáneo e incisivo"),
        language=language,
        tone_general=tone
    )

    user_prompt = f"""Por favor, genera un episodio completo de podcast basado en el siguiente texto fuente.
Se requieren aproximadamente {target_turns} turnos de diálogo profundos y articulados.

=== TEXTO FUENTE ===
{source_text}
=== FIN DEL TEXTO FUENTE ===

Asegúrate de estructurar la salida con el esquema Pydantic solicitado."""

    logger.info(f"Llamando a Gemini ({model_name}) con {len(source_text)} caracteres de texto fuente...")

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.75,
                response_mime_type="application/json",
                response_schema=PodcastScript,
            )
        )

        if not response.text:
            raise RuntimeError("El modelo no devolvió ningún texto en la respuesta.")

        # Parsear con Pydantic directamente o vía JSON
        parsed_data = json.loads(response.text)
        script = PodcastScript.model_validate(parsed_data)
        logger.info(f"Guion generado exitosamente: '{script.episode_title}' con {len(script.turns)} turnos.")
        return script

    except Exception as e:
        logger.error(f"Error durante la generación con Gemini: {str(e)}", exc_info=True)
        raise RuntimeError(f"Error al generar el guion con Gemini: {str(e)}")
