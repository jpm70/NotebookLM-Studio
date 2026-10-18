import {
  DialogueTurn,
  HostConfig,
  StudioSettings,
  VideoBrandingSettings,
  VideoOverlay,
  SlideTableData,
  SlideTerminalData,
} from '../types';

// Polyfill defensivo para entornos o navegadores sin roundRect nativo
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  (CanvasRenderingContext2D.prototype as any).roundRect = function (
    this: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    this.rect(x, y, w, h);
    return this;
  };
}

export class VideoRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cachedLogoImg: HTMLImageElement | null = null;
  private cachedCoverImg: HTMLImageElement | null = null;
  private cachedBackgroundImgs = new Map<string, HTMLImageElement>();
  private imageCache = new Map<string, HTMLImageElement>();

  public getImage(url?: string): HTMLImageElement | null {
    if (!url) return null;
    let img = this.imageCache.get(url);
    if (!img) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      this.imageCache.set(url, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo inicializar el contexto 2D del Canvas');
    this.ctx = context;
  }

  public preloadImages(logoUrl?: string, coverUrl?: string) {
    if (logoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = logoUrl;
      img.onload = () => {
        this.cachedLogoImg = img;
      };
    }
    if (coverUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = coverUrl;
      img.onload = () => {
        this.cachedCoverImg = img;
      };
    }
  }

  /** Precarga los fondos y resuelve cuando todos están decodificados (o tras 15 s como máximo). */
  public preloadTurnBackgrounds(backgrounds?: Record<number, string>): Promise<void> {
    if (!backgrounds) return Promise.resolve();
    const pending: Promise<unknown>[] = [];
    Object.values(backgrounds).forEach((url) => {
      if (!url) return;
      let img = this.cachedBackgroundImgs.get(url);
      if (!img) {
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        this.cachedBackgroundImgs.set(url, img);
      }
      if (!img.complete || img.naturalWidth === 0) {
        pending.push(img.decode().catch(() => undefined));
      }
    });
    const timeout = new Promise((resolve) => setTimeout(resolve, 15000));
    return Promise.race([Promise.all(pending), timeout]).then(() => undefined);
  }

  public resize(aspectRatio: '16:9' | '9:16', resolution: '720p' | '1080p' = '720p') {
    if (aspectRatio === '9:16') {
      this.canvas.width = resolution === '1080p' ? 1080 : 720;
      this.canvas.height = resolution === '1080p' ? 1920 : 1280;
    } else {
      this.canvas.width = resolution === '1080p' ? 1920 : 1280;
      this.canvas.height = resolution === '1080p' ? 1080 : 720;
    }
  }

  public drawFrame(
    time: number,
    turn: DialogueTurn | null,
    turnIndex: number,
    totalTurns: number,
    hostA: HostConfig,
    hostB: HostConfig,
    episodeTitle: string,
    aspectRatio: '16:9' | '9:16',
    isPlaying: boolean,
    branding?: VideoBrandingSettings,
    stage: 'intro' | 'post-intro' | 'dialogue' | 'outro' = 'dialogue',
    turnProgress = 0.5
  ) {
    const { ctx } = this;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const isVertical = aspectRatio === '9:16';

    // Si estamos en etapa de Portada (Intro)
    if (stage === 'intro' && branding?.includeIntro) {
      this.drawIntroCover(time, episodeTitle, hostA, hostB, isVertical, branding, w, h);
      return;
    }

    // Si estamos en etapa de Post-Intro Animada (Animación del Título del Artículo)
    if (stage === 'post-intro' && branding?.includePostIntro !== false) {
      this.drawPostIntroScreen(time, episodeTitle, isVertical, branding, w, h);
      return;
    }

    // Si estamos en etapa de Fin (Outro)
    if (stage === 'outro' && branding?.includeOutro) {
      this.drawOutroScreen(time, episodeTitle, isVertical, branding, w, h);
      return;
    }

    // Etapa regular de diálogo del podcast
    const isHostA = turn ? turn.speaker === 'Host_A' : true;
    const currentEmotion = turn ? turn.emotion : 'reflexivo';
    const currentText = turn ? turn.text : 'Esperando inicio del podcast...';
    const currentVisualTitle = turn ? turn.visual_title : episodeTitle;

    const vStyle = branding?.visualStyle || 'studio';
    const transition = branding?.turnTransition || 'ken-burns';

    // 1. Fondo: Diapositiva Ilustrada de Turno o Estilo Visual Seleccionado
    const bgImgUrl = branding?.turnBackgroundImages?.[turnIndex];
    let bgImg = bgImgUrl ? this.cachedBackgroundImgs.get(bgImgUrl) : null;
    if (!bgImg && bgImgUrl) {
      bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.src = bgImgUrl;
      this.cachedBackgroundImgs.set(bgImgUrl, bgImg);
    }

    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      // Dibujar fondo ilustrado con zoom lento (Ken Burns cinematográfico)
      ctx.save();
      const zoom = transition === 'ken-burns' ? 1.05 + Math.sin(time * 0.15) * 0.03 : 1.02;
      const drawW = w * zoom;
      const drawH = h * zoom;
      const offsetX = (w - drawW) / 2;
      const offsetY = (h - drawH) / 2;
      ctx.drawImage(bgImg, offsetX, offsetY, drawW, drawH);

      // Viñeta suave: la ilustración se ve, y las tarjetas de texto ya llevan su propio panel opaco
      const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
      vignette.addColorStop(0, 'rgba(2, 6, 23, 0.32)');
      vignette.addColorStop(1, 'rgba(2, 6, 23, 0.78)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
      // Franja superior más oscura para que el título se lea sobre cualquier imagen
      const topBand = ctx.createLinearGradient(0, 0, 0, h * 0.28);
      topBand.addColorStop(0, 'rgba(2, 6, 23, 0.7)');
      topBand.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = topBand;
      ctx.fillRect(0, 0, w, h * 0.28);
      ctx.restore();
    } else {
      // Fondos según el Estilo Visual del Vídeo
      if (vStyle === 'anime') {
        // Fondo Anime / Manga Shonen
        const bgGradient = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h));
        bgGradient.addColorStop(0, '#3b0764');
        bgGradient.addColorStop(0.5, '#1e0836');
        bgGradient.addColorStop(1, '#090117');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, w, h);

        // Líneas cinéticas de velocidad estilo manga pulsantes
        ctx.save();
        const pulseSpeed = Math.sin(time * 5) * 0.05;
        ctx.strokeStyle = `rgba(217, 70, 239, ${0.14 + pulseSpeed})`;
        ctx.lineWidth = 2.5;
        const lineCount = 28;
        for (let i = 0; i < lineCount; i++) {
          const angle = (i * Math.PI * 2) / lineCount + (time * 0.1);
          const innerDist = 130 + Math.sin(time * 3 + i) * 20;
          ctx.beginPath();
          ctx.moveTo(w / 2 + Math.cos(angle) * innerDist, h / 2 + Math.sin(angle) * innerDist);
          ctx.lineTo(w / 2 + Math.cos(angle) * w, h / 2 + Math.sin(angle) * w);
          ctx.stroke();
        }

        // Chispas o destellos anime flotantes
        ctx.fillStyle = 'rgba(244, 114, 182, 0.4)';
        for (let i = 0; i < 8; i++) {
          const sparkX = ((Math.sin(time * 0.8 + i * 2) + 1) / 2) * w;
          const sparkY = ((Math.cos(time * 0.6 + i * 1.5) + 1) / 2) * h;
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (vStyle === 'whiteboard') {
        // Pizarra de tiza verde académica
        const bgGradient = ctx.createLinearGradient(0, 0, w, h);
        bgGradient.addColorStop(0, '#0d1f19');
        bgGradient.addColorStop(0.5, '#132821');
        bgGradient.addColorStop(1, '#0a1612');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, w, h);

        // Cuadrícula sutil de tiza
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.09)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 38) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 38) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Borde estilo marco de madera de pizarra
        ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)';
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, w - 8, h - 8);

        // Manchas y polvo sutil de tiza
        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
        for (let i = 0; i < 12; i++) {
          const dx = ((i * 137) % 100) / 100 * w;
          const dy = ((i * 241) % 100) / 100 * h;
          ctx.beginPath();
          ctx.arc(dx, dy, 18 + (i % 6) * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (vStyle === 'cyberpunk') {
        // Cyberpunk Neón con rejilla 2077
        const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
        bgGradient.addColorStop(0, '#02050e');
        bgGradient.addColorStop(0.5, '#07162e');
        bgGradient.addColorStop(1, '#010308');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, w, h);

        // Rejilla de suelo en perspectiva 3D
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.16)';
        ctx.lineWidth = 1.5;
        const horizon = h * 0.48;
        for (let x = -w * 0.5; x <= w * 1.5; x += 75) {
          ctx.beginPath();
          ctx.moveTo(w / 2 + (x - w / 2) * 0.1, horizon);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = horizon; y <= h; y += (h - horizon) / 8) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Scanlines holográficas
        ctx.fillStyle = 'rgba(6, 182, 212, 0.03)';
        for (let y = 0; y < h; y += 4) {
          ctx.fillRect(0, y, w, 1.5);
        }
      } else if (vStyle === 'minimal') {
        // Documental Minimalista Escandinavo
        const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
        bgGradient.addColorStop(0, '#0c0c0e');
        bgGradient.addColorStop(0.5, '#16161a');
        bgGradient.addColorStop(1, '#08080a');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w * 0.08, h * 0.19);
        ctx.lineTo(w * 0.92, h * 0.19);
        ctx.stroke();
      } else {
        // 'studio' (predeterminado)
        const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
        bgGradient.addColorStop(0, '#090d16');
        bgGradient.addColorStop(0.5, '#0f172a');
        bgGradient.addColorStop(1, '#020617');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, w, h);

        // Fondo ambiental sutil
        ctx.save();
        ctx.filter = 'blur(90px)';
        ctx.fillStyle = isHostA ? 'rgba(59, 130, 246, 0.14)' : 'rgba(245, 158, 11, 0.14)';
        ctx.beginPath();
        ctx.arc(isHostA ? w * 0.3 : w * 0.7, h * 0.4, w * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Efecto de transición entre turnos (Glitch, Crossfade)
    if (transition === 'glitch' && (turnProgress < 0.08 || turnProgress > 0.92)) {
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const sliceY = (h * 0.25) + i * (h * 0.14);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(6, 182, 212, 0.22)' : 'rgba(217, 70, 239, 0.22)';
        ctx.fillRect(0, sliceY, w, 6);
      }
      ctx.restore();
    }

    // 2. Cabecera y Badge
    ctx.save();
    ctx.textAlign = 'center';

    const badgeY = isVertical ? h * 0.06 : h * 0.08;
    const badgeColor = vStyle === 'anime' ? '#f472b6' : vStyle === 'whiteboard' ? '#34d399' : vStyle === 'cyberpunk' ? '#06b6d4' : '#f59e0b';
    ctx.fillStyle = badgeColor;
    ctx.font = `700 ${Math.round(h * 0.018)}px "Plus Jakarta Sans", sans-serif`;
    const styleLabel = vStyle === 'anime' ? '🎌 ANIME SHONEN' : vStyle === 'whiteboard' ? '🎓 PIZARRA MASTERCLASS' : vStyle === 'cyberpunk' ? '🤖 CYBERPUNK 2077' : vStyle === 'minimal' ? '📽️ MINIMAL DOC' : '🎙️ STUDIO BROADCAST';
    ctx.fillText(`${styleLabel} • AUDIO OVERVIEW`, w / 2, badgeY);

    const titleY = isVertical ? h * 0.11 : h * 0.14;
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(h * 0.032)}px "Plus Jakarta Sans", sans-serif`;
    // Recorte según el ancho real (en 9:16 un título de 50 caracteres se salía por los lados)
    let titleTruncated = currentVisualTitle;
    while (titleTruncated.length > 8 && ctx.measureText(titleTruncated).width > w * 0.9) {
      titleTruncated = titleTruncated.slice(0, -2).trimEnd() + '…';
      titleTruncated = titleTruncated.replace(/…+$/, '…');
    }
    ctx.fillText(titleTruncated, w / 2, titleY);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${Math.round(h * 0.016)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(`Turno ${turnIndex + 1} de ${totalTurns} • YouTube Studio Edition`, w / 2, titleY + h * 0.03);
    ctx.restore();

    // 3. Diapositiva Especializada Central: Terminal, Tabla o Tarjeta Contextual Anime
    const hasCenterSlide = Boolean(turn?.terminalData || turn?.tableData || turn?.relevantText);

    if (turn?.slideType === 'terminal' || turn?.terminalData) {
      this.drawTerminalSlide(
        turn.terminalData!,
        turn.sectionTitle || currentVisualTitle,
        turn.relevantText,
        isVertical,
        w,
        h,
        time
      );
    } else if (turn?.slideType === 'table' || turn?.tableData) {
      this.drawTableSlide(
        turn.tableData!,
        turn.sectionTitle || currentVisualTitle,
        turn.relevantText,
        isVertical,
        w,
        h,
        time
      );
    } else if (turn?.relevantText) {
      this.drawContextAnimeCard(
        turn.sectionTitle || currentVisualTitle,
        turn.relevantText,
        isVertical,
        w,
        h
      );
    }

    // 4. Avatares pequeños a los lados de la tarjeta de subtítulos, para no tapar la diapositiva
    const cardTop = isVertical ? (hasCenterSlide ? h * 0.69 : h * 0.58) : h * 0.67;
    const cardBottom = h * 0.93;
    const sideSlot = isVertical ? w * 0.17 : w * 0.14;
    const avatarRadius = Math.min(sideSlot * 0.34, isVertical ? w * 0.06 : h * 0.07);
    const avatarY = cardTop + (cardBottom - cardTop) * 0.42;
    const hostAX = sideSlot / 2;
    const hostBX = w - sideSlot / 2;

    const pulseA = isHostA && isPlaying ? Math.sin(time * 6) * 3 : 0;
    const pulseB = !isHostA && isPlaying ? Math.sin(time * 6) * 3 : 0;

    // Reacción orgánica del oyente (Backchanneling)
    let reactionHostA: string | null = null;
    let reactionHostB: string | null = null;
    if (branding?.enableBackchanneling && isPlaying) {
      // Reacción cíclica durante el turno
      const cycle = (turnProgress * 3.5) % 1;
      if (cycle > 0.45 && cycle < 0.85) {
        let emoEmoji = '💡';
        if (currentEmotion === 'entusiasta') emoEmoji = '👏';
        else if (currentEmotion === 'analítico') emoEmoji = '🤔';
        else if (currentEmotion === 'curioso') emoEmoji = '👀';
        else if (currentEmotion === 'sorprendido') emoEmoji = '😮';
        else if (currentEmotion === 'divertido') emoEmoji = '😄';
        else if (currentEmotion === 'reflexivo') emoEmoji = '✨';

        if (isHostA) {
          reactionHostB = emoEmoji;
        } else {
          reactionHostA = emoEmoji;
        }
      }
    }

    this.drawAvatar(hostAX, avatarY, avatarRadius + pulseA, hostA, isHostA && isPlaying, '#3b82f6', h, reactionHostA);
    this.drawAvatar(hostBX, avatarY, avatarRadius + pulseB, hostB, !isHostA && isPlaying, '#f59e0b', h, reactionHostB);

    // 5. Espectro de ondas sonoras reactivas, justo encima de los subtítulos
    const waveY = cardTop - h * (isVertical ? 0.03 : 0.035);
    this.drawSoundWave(waveY, isVertical, isPlaying, time, w, h);

    // 6. Tarjeta de subtítulos / diálogo sincronizado, entre los dos avatares
    const cardMargin = sideSlot;
    const cardWidth = w - cardMargin * 2;
    const cardHeight = cardBottom - cardTop;

    if (branding?.enabledSubtitles !== false) {
      this.drawSubtitleCard(
        cardMargin,
        cardTop,
        cardWidth,
        cardHeight,
        isHostA ? hostA.name : hostB.name,
        isHostA,
        currentEmotion,
        currentText,
        w,
        h,
        branding?.subtitleFontSize || 'medium',
        branding?.subtitleStyle || 'card',
        turnProgress
      );
    }

    // 6. Watermark del logo en la esquina seleccionada SIN DISTORSIÓN
    if (branding?.enabledLogo) {
      this.drawLogoWatermark(branding, w, h);
    }

    // 7. Capas de Superposición Personalizadas en Línea de Tiempo (Textos e Imágenes)
    if (branding?.overlays && branding.overlays.length > 0) {
      this.drawOverlays(time, branding.overlays, w, h, isVertical);
    }
  }

  // Dibuja el logo sin distorsionar en la esquina configurada
  public drawLogoWatermark(branding: VideoBrandingSettings, w: number, h: number) {
    const { ctx } = this;
    let img = this.cachedLogoImg;
    if (!img && branding.logoUrl) {
      img = new Image();
      img.src = branding.logoUrl;
      this.cachedLogoImg = img;
    }
    if (!img || !img.complete || img.naturalWidth === 0) return;

    ctx.save();
    ctx.globalAlpha = branding.logoOpacity ?? 0.85;

    // Calcular dimensiones sin distorsión (object-contain preservando ratio)
    const sizePercent = (branding.logoSizePercent || 14) / 100;
    const maxDimension = Math.min(w, h) * sizePercent;
    const aspect = img.naturalWidth / img.naturalHeight;

    let drawW = maxDimension;
    let drawH = drawW / aspect;
    if (drawH > maxDimension) {
      drawH = maxDimension;
      drawW = drawH * aspect;
    }

    const margin = Math.round(Math.min(w, h) * 0.035);
    let x = margin;
    let y = margin;

    switch (branding.logoPosition) {
      case 'top-left':
        x = margin;
        y = margin;
        break;
      case 'top-right':
        x = w - margin - drawW;
        y = margin;
        break;
      case 'bottom-left':
        x = margin;
        y = h - margin - drawH;
        break;
      case 'bottom-right':
      default:
        x = w - margin - drawW;
        y = h - margin - drawH;
        break;
    }

    // Fondo sutil redondeado para dar contraste profesional
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.roundRect(x - 6, y - 6, drawW + 12, drawH + 12, 10);
    ctx.fill();

    // Dibujar el logo sin distorsión
    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();
  }

  // Dibuja las capas de superposición activas (textos e imágenes) en el timestamp actual
  public drawOverlays(
    time: number,
    overlays: VideoOverlay[],
    w: number,
    h: number,
    isVertical: boolean
  ) {
    const { ctx } = this;

    overlays.forEach((overlay) => {
      // Verificar si el segundo actual está en el rango [startTime, endTime]
      if (time < overlay.startTime || time > overlay.endTime) return;

      const elapsed = time - overlay.startTime;
      const remaining = overlay.endTime - time;

      // Animación suave de entrada y salida (0.3s)
      let animAlpha = 1.0;
      let animScale = 1.0;
      let animOffsetY = 0;

      const fadeDuration = 0.35;
      if (elapsed < fadeDuration) {
        const factor = elapsed / fadeDuration;
        animAlpha = factor;
        if (overlay.animation === 'pop') animScale = 0.8 + 0.2 * factor;
        if (overlay.animation === 'slide-up') animOffsetY = (1 - factor) * 25;
      } else if (remaining < fadeDuration) {
        const factor = remaining / fadeDuration;
        animAlpha = factor;
        if (overlay.animation === 'pop') animScale = 0.8 + 0.2 * factor;
        if (overlay.animation === 'slide-up') animOffsetY = (1 - factor) * -20;
      }

      ctx.save();
      ctx.globalAlpha = (overlay.opacity ?? 1.0) * Math.max(0, Math.min(1, animAlpha));

      const posX = (overlay.positionX / 100) * w;
      const posY = (overlay.positionY / 100) * h + animOffsetY;

      if (overlay.type === 'text' && overlay.text) {
        this.renderTextOverlay(overlay, posX, posY, w, h, isVertical, animScale);
      } else if (overlay.type === 'image' && overlay.imageUrl) {
        this.renderImageOverlay(overlay, posX, posY, w, h, isVertical, animScale);
      }

      ctx.restore();
    });
  }

  private renderTextOverlay(
    overlay: VideoOverlay,
    x: number,
    y: number,
    w: number,
    h: number,
    isVertical: boolean,
    scale: number
  ) {
    const { ctx } = this;
    const text = overlay.text || '';
    if (!text) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const style = overlay.textStyle || 'headline';
    const fontScale =
      overlay.fontSize === 'huge'
        ? 0.045
        : overlay.fontSize === 'large'
        ? 0.035
        : overlay.fontSize === 'small'
        ? 0.018
        : 0.026;
    const fontSize = Math.round(h * fontScale);

    ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (style === 'lower-third') {
      // Estilo cintillo televisivo (Lower third)
      const metrics = ctx.measureText(text);
      const padX = 26;
      const padY = 14;
      const cardW = metrics.width + padX * 2;
      const cardH = fontSize + padY * 2;

      ctx.fillStyle = overlay.textBgColor || 'rgba(15, 23, 42, 0.94)';
      ctx.beginPath();
      ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      ctx.fill();

      // Franja de acento inferior
      ctx.fillStyle = overlay.textColor || '#f59e0b';
      ctx.fillRect(-cardW / 2, cardH / 2 - 4, cardW, 4);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 0, 0);
    } else if (style === 'neon') {
      // Estilo Neón Cyberpunk con resplandor
      ctx.shadowColor = overlay.textColor || '#06b6d4';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = overlay.textColor || '#06b6d4';
      ctx.lineWidth = 2;
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 0, 0);
    } else if (style === 'badge') {
      // Badge / Píldora destacada
      const metrics = ctx.measureText(text);
      const padX = 20;
      const padY = 8;
      const cardW = metrics.width + padX * 2;
      const cardH = fontSize + padY * 2;

      ctx.fillStyle = overlay.textBgColor || '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, cardH / 2);
      ctx.fill();

      ctx.fillStyle = overlay.textColor || '#0f172a';
      ctx.font = `900 ${fontSize * 0.92}px "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.fillText(text, 0, 0);
    } else if (style === 'alert') {
      // Alerta de atención
      const metrics = ctx.measureText(text);
      const cardW = metrics.width + 42;
      const cardH = fontSize + 24;

      ctx.fillStyle = 'rgba(225, 29, 72, 0.95)';
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(`🚨 ${text}`, 0, 0);
    } else if (style === 'quote') {
      // Cita textual
      const lines = this.wrapText(text, isVertical ? 25 : 45);
      const lineHeight = fontSize * 1.35;
      const blockH = lines.length * lineHeight;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      const maxW = Math.min(w * 0.85, 700);
      ctx.beginPath();
      ctx.roundRect(-maxW / 2, -blockH / 2 - 20, maxW, blockH + 40, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#c7d2fe';
      lines.forEach((line, i) => {
        const lineY = -blockH / 2 + i * lineHeight + lineHeight / 2;
        ctx.fillText(`“${line}”`, 0, lineY);
      });
    } else {
      // 'headline' por defecto
      const metrics = ctx.measureText(text);
      const padX = 26;
      const padY = 16;
      const cardW = metrics.width + padX * 2;
      const cardH = fontSize + padY * 2;

      ctx.fillStyle = overlay.textBgColor || 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = overlay.textColor || 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = overlay.textColor || '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 12;
      ctx.fillText(text, 0, 0);
    }

    ctx.restore();
  }

  private renderImageOverlay(
    overlay: VideoOverlay,
    x: number,
    y: number,
    w: number,
    h: number,
    isVertical: boolean,
    scale: number
  ) {
    const { ctx } = this;
    if (!overlay.imageUrl) return;

    let img = this.getImage(overlay.imageUrl);
    if (!img) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = overlay.imageUrl;
      this.imageCache.set(overlay.imageUrl, img);
    }

    if (!img.complete || img.naturalWidth === 0) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const widthPct = (overlay.widthPercent || 30) / 100;
    const targetW = w * widthPct;
    const aspect = img.naturalWidth / img.naturalHeight;
    const targetH = targetW / aspect;

    // Sombra suave para separar del fondo
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 20;

    ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
    ctx.restore();
  }

  // Renderiza la Portada (Intro Cover) con efectos visuales configurables
  private drawIntroCover(
    time: number,
    episodeTitle: string,
    hostA: HostConfig,
    hostB: HostConfig,
    isVertical: boolean,
    branding: VideoBrandingSettings,
    w: number,
    h: number
  ) {
    const { ctx } = this;
    const effect = branding.introAnimation || 'cinematic-zoom';
    const introDuration = Math.max(1, branding.introDuration || 3.5);
    const progress = Math.min(1.0, Math.max(0.0, (time % introDuration) / introDuration));

    // Logo específico o fallback
    const logoUrl = branding.introLogoUrl || branding.logoUrl;
    const img = this.getImage(logoUrl) || this.cachedLogoImg;

    ctx.save();

    // 1. Fondo según efecto visual
    if (effect === 'neon-glitch') {
      // Fondo cibernético oscuro con gradiente
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#0b1329');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Líneas de scanline holográficas
      ctx.fillStyle = 'rgba(56, 189, 248, 0.03)';
      for (let y = 0; y < h; y += 6) {
        ctx.fillRect(0, y, w, 2);
      }

      // Halo de luz neón cian/ámbar
      const glitchPulse = Math.sin(time * 8) * 0.15;
      const glowGrad = ctx.createRadialGradient(w / 2, h * 0.35, 10, w / 2, h * 0.35, Math.min(w, h) * 0.45);
      glowGrad.addColorStop(0, 'rgba(6, 182, 212, 0.28)');
      glowGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.15)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);
    } else if (effect === 'spotlight-reveal') {
      // Fondo negro absoluto con foco teatral
      ctx.fillStyle = '#02040a';
      ctx.fillRect(0, 0, w, h);

      const spotRadius = Math.min(w, h) * (0.2 + 0.55 * Math.min(1, progress * 1.3));
      const spotGrad = ctx.createRadialGradient(w / 2, h * 0.38, 0, w / 2, h * 0.38, spotRadius);
      spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      spotGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.22)');
      spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.38, spotRadius, 0, Math.PI * 2);
      ctx.fill();
    } else if (effect === 'minimal-slide') {
      // Fondo oscuro elegante y sobrio estilo estudio
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.6, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Línea de acento expansiva
      const lineW = w * 0.45 * Math.min(1, progress * 1.6);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w / 2 - lineW / 2, isVertical ? h * 0.14 : h * 0.16);
      ctx.lineTo(w / 2 + lineW / 2, isVertical ? h * 0.14 : h * 0.16);
      ctx.stroke();
    } else if (effect === 'pulse-impact') {
      // Fondo de impacto con gradiente profundo
      const bgGrad = ctx.createRadialGradient(w / 2, h * 0.36, 20, w / 2, h / 2, Math.max(w, h));
      bgGrad.addColorStop(0, '#1e1b4b');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Ondas de choque concéntricas expansivas
      const wave1 = (progress * 1.6) % 1.0;
      const wave2 = (progress * 1.6 + 0.4) % 1.0;
      const maxRadius = Math.min(w, h) * 0.65;

      [wave1, wave2].forEach((wVal) => {
        const radius = wVal * maxRadius;
        const alpha = Math.max(0, 1 - wVal);
        ctx.strokeStyle = `rgba(245, 158, 11, ${alpha * 0.5})`;
        ctx.lineWidth = 4 * (1 - wVal);
        ctx.beginPath();
        ctx.arc(w / 2, isVertical ? h * 0.28 : h * 0.30, radius, 0, Math.PI * 2);
        ctx.stroke();
      });
    } else {
      // 'cinematic-zoom' (por defecto)
      const bgGradient = ctx.createLinearGradient(0, 0, w, h);
      bgGradient.addColorStop(0, '#020617');
      bgGradient.addColorStop(0.5, '#0f172a');
      bgGradient.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, w, h);

      // Resplandor central dorado pulsante
      const pulse = Math.sin(time * 3.5) * 8;
      const haloRadius = Math.min(w, h) * (0.28 + 0.1 * Math.min(1, progress * 1.2)) + pulse;
      const glowGrad = ctx.createRadialGradient(w / 2, isVertical ? h * 0.28 : h * 0.30, 10, w / 2, isVertical ? h * 0.28 : h * 0.30, haloRadius);
      glowGrad.addColorStop(0, 'rgba(245, 158, 11, 0.26)');
      glowGrad.addColorStop(0.6, 'rgba(59, 130, 246, 0.12)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(w / 2, isVertical ? h * 0.28 : h * 0.30, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // Micro-partículas doradas cinemáticas flotando
      ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
      for (let i = 0; i < 18; i++) {
        const px = (w * 0.15 + (i * 97) % (w * 0.7) + Math.sin(time + i) * 12);
        const py = (h * 0.12 + (i * 53) % (h * 0.75) + Math.cos(time + i) * 8);
        ctx.beginPath();
        ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Animación de escala, posición y opacidad del Logo
    const logoY = isVertical ? h * 0.28 : h * 0.30;
    const baseLogoSize = isVertical ? w * 0.38 : h * 0.34;

    let scale = 1.0;
    let opacity = 1.0;
    let offsetY = 0;
    let glitchX = 0;

    if (effect === 'cinematic-zoom') {
      scale = 0.74 + 0.32 * Math.min(1.0, progress * 1.25);
      opacity = Math.min(1.0, progress * 2.8);
    } else if (effect === 'neon-glitch') {
      opacity = progress < 0.15 ? (Math.sin(time * 35) > 0 ? 0.9 : 0.3) : 1.0;
      glitchX = progress < 0.35 ? Math.sin(time * 30) * 8 * (1 - progress / 0.35) : 0;
    } else if (effect === 'spotlight-reveal') {
      opacity = Math.min(1.0, Math.max(0, (progress - 0.1) * 2.5));
      scale = 0.88 + 0.14 * Math.min(1.0, progress);
    } else if (effect === 'minimal-slide') {
      offsetY = (1 - Math.min(1.0, Math.pow(progress, 0.65))) * 55;
      opacity = Math.min(1.0, progress * 2.2);
    } else if (effect === 'pulse-impact') {
      const pop = progress < 0.25 ? 1 + Math.sin(progress * Math.PI * 4) * 0.16 : 1.0;
      scale = pop;
      opacity = Math.min(1.0, progress * 3.5);
    }

    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      const aspect = img.naturalWidth / img.naturalHeight;
      const currentSize = baseLogoSize * scale;
      let drawW = currentSize;
      let drawH = drawW / aspect;
      if (drawH > currentSize) {
        drawH = currentSize;
        drawW = drawH * aspect;
      }

      const drawX = w / 2 - drawW / 2 + glitchX;
      const drawY = logoY - drawH / 2 + offsetY;

      // Halo circular con sombra suave
      ctx.shadowColor = effect === 'neon-glitch' ? '#06b6d4' : 'rgba(245, 158, 11, 0.4)';
      ctx.shadowBlur = 24;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    }

    // 3. Textos de Portada con animación suave
    ctx.textAlign = 'center';

    // Badge superior
    const badgeY = (isVertical ? h * 0.10 : h * 0.12) + offsetY * 0.5;
    ctx.fillStyle = effect === 'neon-glitch' ? '#38bdf8' : '#f59e0b';
    ctx.font = `800 ${Math.round(h * 0.020)}px "Plus Jakarta Sans", sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.fillText('🎙️ UN FANTASMA EN EL SISTEMA PRESENTA', w / 2, badgeY);

    // Título Principal de la Portada
    const titleText = branding.introTitle || episodeTitle;
    const titleY = (isVertical ? h * 0.54 : h * 0.55) + offsetY * 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(h * 0.038)}px "Plus Jakarta Sans", sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 14;

    const lines = this.wrapText(titleText, isVertical ? 28 : 50);
    let lineY = titleY;
    for (const line of lines.slice(0, 3)) {
      ctx.fillText(line, w / 2, lineY);
      lineY += h * 0.048;
    }

    // Subtítulo
    const subtitle = branding.introSubtitle || 'Episodio especial con doble locutor estilo NotebookLM';
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${Math.round(h * 0.020)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(subtitle, w / 2, lineY + h * 0.02);

    // Badge de los locutores
    const hostTagY = isVertical ? h * 0.85 : h * 0.84;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    const tagW = Math.min(w * 0.82, 520);
    ctx.beginPath();
    ctx.roundRect(w / 2 - tagW / 2, hostTagY - 24, tagW, 48, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = `600 ${Math.round(h * 0.018)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(`Voces: ${hostA.name} & ${hostB.name} • www.unfantasmaenelsistema.com`, w / 2, hostTagY + 6);

    // Overlays en pantalla de Intro
    if (branding?.overlays && branding.overlays.length > 0) {
      this.drawOverlays(time, branding.overlays, w, h, isVertical);
    }

    ctx.restore();
  }

  // Renderiza la Pantalla de Cierre (Outro Screen) con efectos visuales configurables
  private drawOutroScreen(
    time: number,
    episodeTitle: string,
    isVertical: boolean,
    branding: VideoBrandingSettings,
    w: number,
    h: number
  ) {
    const { ctx } = this;
    const effect = branding.outroAnimation || 'fade-zoom-out';
    const outroDuration = Math.max(1, branding.outroDuration || 3.5);
    const progress = Math.min(1.0, Math.max(0.0, (time % outroDuration) / outroDuration));

    const logoUrl = branding.outroLogoUrl || branding.logoUrl;
    const img = this.getImage(logoUrl) || this.cachedLogoImg;

    ctx.save();

    // 1. Fondo degradado de Cierre
    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, '#090d16');
    bgGradient.addColorStop(0.5, '#020617');
    bgGradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // Resplandor de fondo
    const pulseGlow = Math.sin(time * 3) * 0.08;
    ctx.save();
    ctx.filter = 'blur(80px)';
    ctx.fillStyle = effect === 'neon-pulse' ? `rgba(6, 182, 212, ${0.18 + pulseGlow})` : `rgba(59, 130, 246, ${0.14 + pulseGlow})`;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.38, w * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Logo central con zoom-out suave
    const logoY = isVertical ? h * 0.28 : h * 0.32;
    const baseLogoSize = isVertical ? w * 0.34 : h * 0.32;
    let zoomOutScale = 1.0;

    if (effect === 'fade-zoom-out') {
      zoomOutScale = 1.05 - 0.1 * Math.min(1.0, progress);
    } else if (effect === 'spotlight-exit') {
      zoomOutScale = 1.0 - 0.12 * Math.min(1.0, progress * 1.2);
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      const aspect = img.naturalWidth / img.naturalHeight;
      const currentSize = baseLogoSize * zoomOutScale;
      let drawW = currentSize;
      let drawH = drawW / aspect;
      if (drawH > currentSize) {
        drawH = currentSize;
        drawW = drawH * aspect;
      }

      ctx.shadowColor = 'rgba(245, 158, 11, 0.3)';
      ctx.shadowBlur = 18;
      ctx.drawImage(img, w / 2 - drawW / 2, logoY - drawH / 2, drawW, drawH);
      ctx.restore();
    }

    // 3. Textos y Elementos de Cierre
    ctx.textAlign = 'center';

    const titleY = isVertical ? h * 0.52 : h * 0.54;
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(h * 0.036)}px "Plus Jakarta Sans", sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 10;
    ctx.fillText(branding.outroTitle || '¡Gracias por acompañarnos!', w / 2, titleY);

    const subtitleY = titleY + h * 0.045;
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${Math.round(h * 0.020)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(branding.outroSubtitle || 'Suscríbete y activa la campanita para más análisis', w / 2, subtitleY);

    // Tarjeta del sitio web
    const ctaY = isVertical ? h * 0.67 : h * 0.68;
    const ctaW = Math.min(w * 0.85, 540);
    const ctaH = 60;

    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(w / 2 - ctaW / 2, ctaY, ctaW, ctaH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = `700 ${Math.round(h * 0.022)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(`🌐 ${branding.websiteUrl || 'https://www.unfantasmaenelsistema.com/'}`, w / 2, ctaY + 36);

    // Botón / Call To Action dinámico
    const subBtnY = isVertical ? h * 0.83 : h * 0.85;
    const btnPulse = Math.sin(time * 4) * 4;
    const btnW = 260 + btnPulse;
    const btnH = 44;

    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.roundRect(w / 2 - btnW / 2, subBtnY - btnH / 2, btnW, btnH, btnH / 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(h * 0.019)}px "Plus Jakarta Sans", sans-serif`;
    const ctaText = branding.outroCallToAction || '▶ SUSCRÍBETE AL CANAL';
    ctx.fillText(ctaText.toUpperCase(), w / 2, subBtnY + 6);

    // Overlays en pantalla de Outro
    if (branding?.overlays && branding.overlays.length > 0) {
      this.drawOverlays(time, branding.overlays, w, h, isVertical);
    }

    ctx.restore();
  }

  private drawAvatar(
    x: number,
    y: number,
    radius: number,
    host: HostConfig,
    isActive: boolean,
    themeColor: string,
    canvasHeight: number,
    reactionEmoji?: string | null
  ) {
    const { ctx } = this;

    if (isActive) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = themeColor === '#3b82f6' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(245, 158, 11, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? (themeColor === '#3b82f6' ? '#1e3a8a' : '#78350f') : '#1e293b';
    ctx.fill();

    const avatarImg = host.avatarUrl ? this.getImage(host.avatarUrl) : null;
    if (avatarImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, x - radius, y - radius, radius * 2, radius * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(radius * 0.85)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(host.avatarIcon || (host.name[0] || 'H').toUpperCase(), x, y);
    }
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = isActive ? '#ffffff' : '#94a3b8';
    ctx.font = `700 ${Math.round(canvasHeight * 0.02)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(host.name, x, y + radius + canvasHeight * 0.032);

    // Globo de reacción de asentimiento / complicidad (Backchanneling)
    if (reactionEmoji) {
      const bubbleX = x + radius * 0.75;
      const bubbleY = y - radius * 0.65;
      const bubbleR = Math.max(12, radius * 0.34);

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bubbleX, bubbleY, bubbleR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.font = `${Math.round(bubbleR * 1.15)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(reactionEmoji, bubbleX, bubbleY + 1);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawSoundWave(
    y: number,
    isVertical: boolean,
    isPlaying: boolean,
    time: number,
    w: number,
    h: number
  ) {
    const { ctx } = this;
    const numBars = isVertical ? 28 : 42;
    const spacing = w / (numBars + 1);

    ctx.save();
    for (let i = 0; i < numBars; i++) {
      const x = spacing * (i + 1);
      let barHeight = 4;
      if (isPlaying) {
        const freq = Math.sin(time * 10 + i * 0.4) * Math.cos(time * 5 + i * 0.7);
        barHeight = Math.max(8, Math.abs(freq) * (h * 0.05) + 6);
      }

      ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(x - 2, y - barHeight / 2, 4, barHeight, 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawSubtitleCard(
    x: number,
    y: number,
    width: number,
    height: number,
    speakerName: string,
    isHostA: boolean,
    emotion: string,
    text: string,
    canvasWidth: number,
    canvasHeight: number,
    fontSizeKey: 'small' | 'medium' | 'large' = 'medium',
    styleKey: 'card' | 'bottom-bar' | 'cinema' | 'karaoke' | 'modern-bold' = 'card',
    turnProgress = 0.5
  ) {
    const { ctx } = this;
    if (!text) return;

    ctx.save();

    const fontScale = fontSizeKey === 'large' ? 0.030 : fontSizeKey === 'small' ? 0.020 : 0.025;
    const textSize = Math.round(canvasHeight * fontScale);
    // Caracteres por línea limitados por el ancho de la tarjeta (los avatares ocupan los laterales)
    const fitChars = (base: number) => Math.min(base, Math.max(16, Math.floor((width - 32) / (textSize * 0.56))));

    if (styleKey === 'karaoke') {
      // Estilo Karaoke Viral (TikTok / Shorts / Reels): Resaltado palabra por palabra
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Badge flotante del orador
      const speakerColor = isHostA ? '#60a5fa' : '#fbbf24';
      const badgeY = y + 25;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = speakerColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(canvasWidth / 2 - 130, badgeY - 18, 260, 36, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = speakerColor;
      ctx.font = `700 ${Math.round(canvasHeight * 0.017)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(`🎙️ ${speakerName.toUpperCase()} [${emotion}]`, canvasWidth / 2, badgeY + 1);

      // Desglose en palabras y progreso
      const allWords = text.trim().split(/\s+/);
      const activeWordIndex = Math.min(allWords.length - 1, Math.max(0, Math.floor(turnProgress * allWords.length)));

      // Contenedor de fondo translúcido sutil
      ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
      ctx.beginPath();
      ctx.roundRect(x, y + 54, width, height - 60, 20);
      ctx.fill();

      const lines = this.wrapText(text, fitChars(canvasWidth > canvasHeight ? 52 : 26));
      const startY = y + 90;
      let globalWordIdx = 0;

      lines.slice(0, 4).forEach((line, lineIdx) => {
        const lineWords = line.split(/\s+/);
        const lineY = startY + lineIdx * (textSize * 1.45);

        ctx.font = `800 ${textSize}px "Plus Jakarta Sans", sans-serif`;
        const fullLineWidth = ctx.measureText(line).width;
        let curX = canvasWidth / 2 - fullLineWidth / 2;

        lineWords.forEach((word) => {
          const wWidth = ctx.measureText(word + ' ').width;
          const isSpoken = globalWordIdx < activeWordIndex;
          const isCurrent = globalWordIdx === activeWordIndex;

          ctx.save();
          if (isCurrent) {
            // Palabra activa: Fondo resaltado amarillo/ámbar y pop visual
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 6;
            ctx.strokeText(word, curX + wWidth / 2, lineY);
            ctx.fillText(word, curX + wWidth / 2, lineY);
          } else if (isSpoken) {
            // Palabra ya dicha: Blanco puro brillante
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.strokeText(word, curX + wWidth / 2, lineY);
            ctx.fillText(word, curX + wWidth / 2, lineY);
          } else {
            // Palabra pendiente: Blanco atenuado
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeText(word, curX + wWidth / 2, lineY);
            ctx.fillText(word, curX + wWidth / 2, lineY);
          }
          ctx.restore();

          curX += wWidth;
          globalWordIdx++;
        });
      });
    } else if (styleKey === 'modern-bold') {
      // Estilo Modern Bold: Letras gigantes con sombra dramática
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${Math.round(textSize * 1.12)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = isHostA ? '#60a5fa' : '#f59e0b';
      ctx.fillText(`${speakerName.toUpperCase()}`, canvasWidth / 2, y + 25);

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 12;

      const lines = this.wrapText(text, fitChars(canvasWidth > canvasHeight ? 56 : 28));
      let lineY = y + 75;
      for (const line of lines.slice(0, 3)) {
        ctx.strokeText(line, canvasWidth / 2, lineY);
        ctx.fillText(line, canvasWidth / 2, lineY);
        lineY += textSize * 1.5;
      }
    } else if (styleKey === 'cinema') {
      // Estilo Cine: Subtítulo flotante limpio con reborde negro intenso
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.font = `700 ${textSize}px "Plus Jakarta Sans", sans-serif`;
      
      const badgeY = y + height - 85;
      const speakerColor = isHostA ? '#60a5fa' : '#fbbf24';
      ctx.fillStyle = speakerColor;
      ctx.font = `600 ${Math.round(canvasHeight * 0.017)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(`${speakerName.toUpperCase()} [${emotion}]`, canvasWidth / 2, badgeY);

      ctx.font = `700 ${textSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;

      const lines = this.wrapText(text, fitChars(canvasWidth > canvasHeight ? 56 : 30));
      let lineY = y + height - 40 - (lines.length - 1) * (textSize * 1.3);
      for (const line of lines.slice(0, 3)) {
        ctx.strokeText(line, canvasWidth / 2, lineY);
        ctx.fillText(line, canvasWidth / 2, lineY);
        lineY += textSize * 1.3;
      }
    } else if (styleKey === 'bottom-bar') {
      // Estilo YouTube Bar: Franja horizontal oscura en la parte inferior
      const barY = canvasHeight * 0.78;
      const barH = canvasHeight * 0.18;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(x, barY, width, barH);

      // Línea superior con color del anfitrión
      ctx.fillStyle = isHostA ? '#3b82f6' : '#f59e0b';
      ctx.fillRect(x, barY, width, 3);

      // Speaker tag
      ctx.font = `700 ${Math.round(canvasHeight * 0.018)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = isHostA ? '#93c5fd' : '#fcd34d';
      ctx.fillText(`[${speakerName} • ${emotion}]`, x + 16, barY + canvasHeight * 0.035);

      // Texto subtítulo
      ctx.font = `500 ${textSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#f8fafc';
      const lines = this.wrapText(text, fitChars(canvasWidth > canvasHeight ? 70 : 36));
      let lineY = barY + canvasHeight * 0.075;
      for (const line of lines.slice(0, 3)) {
        ctx.fillText(line, x + 16, lineY);
        lineY += textSize * 1.35;
      }
    } else {
      // Estilo Card: Tarjeta redondeada con efecto vidrio
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = isHostA ? 'rgba(59, 130, 246, 0.4)' : 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 16);
      ctx.fill();
      ctx.stroke();

      const badgeBg = isHostA ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)';
      const badgeColor = isHostA ? '#60a5fa' : '#fbbf24';
      ctx.fillStyle = badgeBg;
      ctx.beginPath();
      ctx.roundRect(x + 20, y + 16, 220, 36, 8);
      ctx.fill();

      ctx.fillStyle = badgeColor;
      ctx.font = `600 ${Math.round(canvasHeight * 0.018)}px "Plus Jakarta Sans", sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(`${speakerName} • [${emotion}]`, x + 32, y + 34);

      ctx.fillStyle = '#f8fafc';
      ctx.font = `500 ${textSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.textBaseline = 'top';

      const lines = this.wrapText(text, fitChars(canvasWidth > canvasHeight ? 68 : 34));
      let lineY = y + 66;
      for (let i = 0; i < Math.min(lines.length, 4); i++) {
        ctx.fillText(lines[i], x + 24, lineY);
        lineY += textSize * 1.4;
      }
    }

    ctx.restore();
  }

  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxChars) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // =========================================================================
  // =========================================================================
  // POST-INTRO ANIMADA CINEMÁTICA AVANZADA (Título del Artículo en Modo Animación)
  // =========================================================================
  public drawPostIntroScreen(
    time: number,
    episodeTitle: string,
    isVertical: boolean,
    branding: VideoBrandingSettings | undefined,
    w: number,
    h: number
  ) {
    const { ctx } = this;
    const duration = branding?.postIntroDuration || 3.5;
    const progress = Math.min(1.0, Math.max(0.0, (time % duration) / duration));

    ctx.save();

    // 1. Fondo tecnológico con rejilla de profundidad anamórfica
    const bg = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h));
    bg.addColorStop(0, '#090d16');
    bg.addColorStop(0.5, '#050811');
    bg.addColorStop(1, '#020409');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Rejilla cibernética con desvanecimiento de horizonte
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
    ctx.lineWidth = 1;
    const gridSpacing = isVertical ? 36 : 48;
    const shiftY = (time * 18) % gridSpacing;
    for (let y = shiftY; y < h; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x < w; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Partículas bokeh flotantes cinemáticas
    for (let i = 0; i < 24; i++) {
      const pSeed = (i * 137.5) % 1;
      const px = ((i * 123.45 + time * 15 * (i % 2 === 0 ? 1 : -1)) % w + w) % w;
      const py = ((i * 87.65 + time * 20) % h + h) % h;
      const pR = (pSeed * 3.5) + 1.2;
      const pAlpha = 0.2 + 0.35 * Math.sin(time * 3 + i);
      ctx.fillStyle = i % 3 === 0 ? `rgba(56, 189, 248, ${pAlpha})` : i % 3 === 1 ? `rgba(52, 211, 153, ${pAlpha})` : `rgba(244, 114, 182, ${pAlpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(px, py, pR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Destello óptico anamórfico central (Optical Flare horizontal sweep)
    const flareProgress = Math.min(1.0, progress * 1.8);
    const flareAlpha = Math.sin(flareProgress * Math.PI) * 0.65;
    if (flareAlpha > 0.01) {
      ctx.save();
      const flareGrad = ctx.createLinearGradient(0, h * 0.44, w, h * 0.44);
      flareGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      flareGrad.addColorStop(0.35, `rgba(56, 189, 248, ${flareAlpha * 0.3})`);
      flareGrad.addColorStop(0.5, `rgba(255, 255, 255, ${flareAlpha})`);
      flareGrad.addColorStop(0.65, `rgba(52, 211, 153, ${flareAlpha * 0.3})`);
      flareGrad.addColorStop(1, 'rgba(52, 211, 153, 0)');
      ctx.fillStyle = flareGrad;
      ctx.fillRect(0, h * 0.44 - 4, w, 8);

      // Resplandor radial en el punto focal
      const coreGrad = ctx.createRadialGradient(w / 2, h * 0.44, 2, w / 2, h * 0.44, w * 0.28);
      coreGrad.addColorStop(0, `rgba(255, 255, 255, ${flareAlpha * 0.8})`);
      coreGrad.addColorStop(0.2, `rgba(56, 189, 248, ${flareAlpha * 0.4})`);
      coreGrad.addColorStop(0.6, `rgba(52, 211, 153, ${flareAlpha * 0.15})`);
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.44, w * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Esquinas tácticas militares / HUD cinematográfico
    const cornerSize = isVertical ? 22 : 36;
    const cornerPad = isVertical ? 28 : 44;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(cornerPad, cornerPad + cornerSize);
    ctx.lineTo(cornerPad, cornerPad);
    ctx.lineTo(cornerPad + cornerSize, cornerPad);
    ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(w - cornerPad - cornerSize, cornerPad);
    ctx.lineTo(w - cornerPad, cornerPad);
    ctx.lineTo(w - cornerPad, cornerPad + cornerSize);
    ctx.stroke();
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(cornerPad, h - cornerPad - cornerSize);
    ctx.lineTo(cornerPad, h - cornerPad);
    ctx.lineTo(cornerPad + cornerSize, h - cornerPad);
    ctx.stroke();
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(w - cornerPad - cornerSize, h - cornerPad);
    ctx.lineTo(w - cornerPad, h - cornerPad);
    ctx.lineTo(w - cornerPad, h - cornerPad - cornerSize);
    ctx.stroke();

    // 2. Textos animados del Artículo
    const fullTitle = branding?.introTitle || episodeTitle || 'Artículo Técnico';
    const categoryTag = branding?.articleCategory || 'Redes inalámbricas | unfantasmaenelsistema.com';

    let mainTitle = fullTitle;
    let subTitle = branding?.introSubtitle || '';
    if (fullTitle.includes(':') && !subTitle) {
      const parts = fullTitle.split(':');
      mainTitle = parts[0].trim() + ':';
      subTitle = parts.slice(1).join(':').trim();
    }

    ctx.textAlign = 'center';

    // Animación cinética suave con elasticidad
    const titleAlpha = Math.min(1.0, progress * 2.8);
    const easeOutCubic = 1 - Math.pow(1 - Math.min(1.0, progress * 1.5), 3);
    const scale = 0.88 + 0.12 * easeOutCubic;

    ctx.save();
    ctx.translate(w / 2, h * 0.44);
    ctx.scale(scale, scale);

    // Badge de Categoría con borde neón animado
    const catAlpha = Math.min(1.0, Math.max(0, (progress - 0.06) * 3));
    ctx.globalAlpha = catAlpha;
    const catW = Math.min(w * 0.82, 480);
    const catH = 38;
    const catY = isVertical ? -150 : -130;

    ctx.fillStyle = 'rgba(11, 18, 33, 0.92)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.roundRect(-catW / 2, catY, catW, catH, 19);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#38bdf8';
    ctx.font = `800 ${Math.round(h * 0.017)}px "Fira Code", "Plus Jakarta Sans", monospace`;
    ctx.fillText(`⚡ ${categoryTag.toUpperCase()}`, 0, catY + 24);

    // Título Principal en blanco ultra nítido con sombra cinemática
    ctx.globalAlpha = titleAlpha;
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(h * 0.068)}px "Plus Jakarta Sans", sans-serif`;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.75)';
    ctx.shadowBlur = 28;
    ctx.fillText(mainTitle, 0, -22);

    // Haz láser horizontal debajo del título
    const beamW = Math.min(w * 0.7, 560) * easeOutCubic;
    ctx.shadowColor = 'rgba(52, 211, 153, 0.8)';
    ctx.shadowBlur = 12;
    const beamGrad = ctx.createLinearGradient(-beamW / 2, 0, beamW / 2, 0);
    beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    beamGrad.addColorStop(0.2, '#38bdf8');
    beamGrad.addColorStop(0.5, '#ffffff');
    beamGrad.addColorStop(0.8, '#34d399');
    beamGrad.addColorStop(1, 'rgba(52, 211, 153, 0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(-beamW / 2, -4, beamW, 3.5);

    // Subtítulo con acento verde (#3FA34D / #34d399) y stagger animado
    const subAlpha = Math.min(1.0, Math.max(0, (progress - 0.20) * 3));
    ctx.globalAlpha = subAlpha;
    ctx.fillStyle = '#34d399';
    ctx.font = `800 ${Math.round(h * 0.032)}px "Plus Jakarta Sans", sans-serif`;
    ctx.shadowColor = 'rgba(16, 185, 129, 0.65)';
    ctx.shadowBlur = 20;

    const subLines = this.wrapText(subTitle, isVertical ? 26 : 52);
    let subY = 40;
    for (const line of subLines.slice(0, 2)) {
      ctx.fillText(line, 0, subY);
      subY += h * 0.042;
    }

    ctx.restore();

    // 3. Espectro de audio y transición al Punto 1
    const barW = Math.min(w * 0.65, 520);
    const barY = isVertical ? h * 0.79 : h * 0.82;

    // Mini barras de frecuencia cinemática animada
    const numFreq = 28;
    const freqW = barW / numFreq;
    for (let f = 0; f < numFreq; f++) {
      const fX = (w / 2 - barW / 2) + f * freqW + 2;
      const wave = Math.sin(time * 8 + f * 0.35) * Math.cos(time * 4 + f * 0.2);
      const fH = Math.max(3, Math.abs(wave) * 22 * progress);
      ctx.fillStyle = f % 2 === 0 ? '#38bdf8' : '#34d399';
      ctx.fillRect(fX, barY - 18 - fH / 2, Math.max(2, freqW - 3), fH);
    }

    // Barra de carga de transición
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - barW / 2, barY, barW, 7, 3.5);
    ctx.fill();

    const filledW = barW * Math.min(1.0, progress * 1.12);
    const barGrad = ctx.createLinearGradient(w / 2 - barW / 2, 0, w / 2 - barW / 2 + filledW, 0);
    barGrad.addColorStop(0, '#38bdf8');
    barGrad.addColorStop(0.5, '#60a5fa');
    barGrad.addColorStop(1, '#34d399');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(w / 2 - barW / 2, barY, filledW, 7, 3.5);
    ctx.fill();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `700 ${Math.round(h * 0.016)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText('INICIANDO ANÁLISIS • DIAPOSITIVA 1 // PUNTOS CLAVE', w / 2, barY + 28);

    ctx.restore();
  }

  // =========================================================================
  // DIAPOSITIVA DE TERMINAL ENRIQUECIDA (Estilo macOS / Linux con syntax coloring)
  // =========================================================================
  public drawTerminalSlide(
    term: SlideTerminalData,
    sectionTitle: string,
    relevantText: string | undefined,
    isVertical: boolean,
    w: number,
    h: number,
    time: number
  ) {
    const { ctx } = this;
    ctx.save();

    const termW = isVertical ? w * 0.92 : w * 0.76;
    const termH = isVertical ? h * 0.34 : h * 0.40;
    const termX = (w - termW) / 2;
    const termY = isVertical ? h * 0.17 : h * 0.19;

    // Sombra profunda y resplandor de ventana
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;

    // Fondo ventana estilo iTerm2 / Alacritty
    ctx.fillStyle = '#080c14';
    ctx.strokeStyle = '#263346';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(termX, termY, termW, termH, 14);
    ctx.fill();
    ctx.stroke();

    // Barra superior de ventana estilo macOS
    const titleBarH = 38;
    const barGrad = ctx.createLinearGradient(termX, termY, termX, termY + titleBarH);
    barGrad.addColorStop(0, '#1a2333');
    barGrad.addColorStop(1, '#111827');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(termX, termY, termW, titleBarH, [14, 14, 0, 0]);
    ctx.fill();

    // Línea separadora sutil
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(termX, termY + titleBarH);
    ctx.lineTo(termX + termW, termY + titleBarH);
    ctx.stroke();

    // Botones de ventana estilo macOS (con círculos de colores y brillo especular)
    const btnY = termY + titleBarH / 2;
    const btnRadius = 6;
    // Cerrar (#ff5f56)
    ctx.beginPath();
    ctx.arc(termX + 22, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff5f56';
    ctx.fill();
    // Minimizar (#ffbd2e)
    ctx.beginPath();
    ctx.arc(termX + 42, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffbd2e';
    ctx.fill();
    // Maximizar (#27c93f)
    ctx.beginPath();
    ctx.arc(termX + 62, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#27c93f';
    ctx.fill();

    // Pestaña central con icono de terminal y directorio de trabajo
    ctx.fillStyle = '#94a3b8';
    ctx.font = `600 ${Math.round(h * 0.015)}px "Fira Code", monospace`;
    ctx.textAlign = 'center';
    const termTitle = term.title || sectionTitle || 'bash — 80x24 • ~/audit-wifi';
    ctx.fillText(`💻 ${termTitle}`, termX + termW / 2, termY + 24);

    // Badge de Host en esquina derecha
    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.font = `700 ${Math.round(h * 0.013)}px "Fira Code", monospace`;
    ctx.fillText('kali@security:~$', termX + termW - 16, termY + 24);

    // Efecto sutil de scanlines CRT en el cuerpo de la terminal
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(termX, termY + titleBarH, termW, termH - titleBarH, [0, 0, 14, 14]);
    ctx.clip();
    for (let sy = termY + titleBarH; sy < termY + termH; sy += 4) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.fillRect(termX, sy, termW, 1);
    }
    ctx.restore();

    // Contenido de la consola con resalto de sintaxis de comandos
    ctx.textAlign = 'left';
    const fontSize = Math.max(12, Math.round(h * 0.0165));
    ctx.font = `600 ${fontSize}px "Fira Code", "Courier New", Consolas, monospace`;

    const contentPadX = termX + 24;
    let lineY = termY + titleBarH + 28;
    const maxLines = isVertical ? 6 : 7;
    const linesToDraw = term.lines.slice(0, maxLines);

    // Listado de comandos comunes para colorear verbos
    const KNOWN_COMMANDS = [
      'sudo', 'airmon-ng', 'airodump-ng', 'kismet', 'hcxdumptool', 'aireplay-ng',
      'grep', 'systemctl', 'nmap', 'ip', 'iw', 'iwconfig', 'cat', 'curl', 'docker',
      'apt', 'pip', 'python3', 'echo', 'chmod', 'rfkill', 'wireshark', 'tshark'
    ];

    linesToDraw.forEach((rawLine) => {
      const line = rawLine.trim();

      if (line.startsWith('#')) {
        // Línea de comentario en gris pizarra azulado
        ctx.fillStyle = '#64748b';
        ctx.fillText(line, contentPadX, lineY);
      } else if (line.startsWith('$') || line.startsWith('sudo') || KNOWN_COMMANDS.some(cmd => line.startsWith(cmd))) {
        // Línea de comando ejecutada
        let cmdText = line;
        if (line.startsWith('$')) {
          ctx.fillStyle = '#10b981'; // Prompt verde
          ctx.fillText('$', contentPadX, lineY);
          cmdText = line.replace(/^\$\s*/, '');
        } else {
          ctx.fillStyle = '#38bdf8'; // Prompt cyan
          ctx.fillText('➜', contentPadX, lineY);
        }

        // Tokenizar comando, flags y argumentos
        const tokens = cmdText.split(/\s+/);
        let curX = contentPadX + 18;

        tokens.forEach((token, tIdx) => {
          if (tIdx === 0 && (KNOWN_COMMANDS.includes(token.toLowerCase()) || token === 'sudo')) {
            ctx.fillStyle = '#4ade80'; // Verbo del comando en verde neón
          } else if (token.startsWith('-')) {
            ctx.fillStyle = '#fbbf24'; // Parámetro o flag (-i, --bssid, -w) en amarillo ámbar
          } else if (token.includes('/') || token.includes(':') || token.startsWith('wlan') || token.startsWith('eth')) {
            ctx.fillStyle = '#c084fc'; // Interfaces de red, rutas o MACs en violeta
          } else if (/^\d+$/.test(token)) {
            ctx.fillStyle = '#fb923c'; // Canales o números en naranja
          } else {
            ctx.fillStyle = '#f1f5f9'; // Texto estándar
          }

          ctx.fillText(token, curX, lineY);
          curX += ctx.measureText(token + ' ').width;
        });
      } else {
        // Línea de salida o resultado de terminal
        if (line.startsWith('[+]') || line.includes('OK') || line.includes('WPA') || line.includes('FOUND')) {
          ctx.fillStyle = '#34d399'; // Éxito en esmeralda
          ctx.fillText(line, contentPadX + 10, lineY);
        } else if (line.startsWith('[*]') || line.startsWith('BSSID') || line.startsWith('CH')) {
          ctx.fillStyle = '#38bdf8'; // Info en azul cielo
          ctx.fillText(line, contentPadX + 10, lineY);
        } else if (line.startsWith('[!]') || line.includes('ERR') || line.includes('WARN')) {
          ctx.fillStyle = '#f87171'; // Alerta en rojo suave
          ctx.fillText(line, contentPadX + 10, lineY);
        } else {
          ctx.fillStyle = '#cbd5e1'; // Salida limpia en slate
          ctx.fillText(line, contentPadX + 10, lineY);
        }
      }

      lineY += fontSize * 1.65;
    });

    // Cursor parpadeante estilo bloque terminal
    const blink = Math.sin(time * 7) > 0;
    if (blink && linesToDraw.length < maxLines) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('➜', contentPadX, lineY);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(contentPadX + 18, lineY - fontSize + 3, 9, fontSize);
    }

    ctx.restore();
  }

  // =========================================================================
  // DIAPOSITIVA DE TABLA AUTOADAPTABLE (Matriz comparativa con anchos dinámicos)
  // =========================================================================
  public drawTableSlide(
    tbl: SlideTableData,
    sectionTitle: string,
    relevantText: string | undefined,
    isVertical: boolean,
    w: number,
    h: number,
    time: number
  ) {
    const { ctx } = this;
    ctx.save();

    const tblW = isVertical ? w * 0.94 : w * 0.82;
    const tblH = isVertical ? h * 0.35 : h * 0.40;
    const tblX = (w - tblW) / 2;
    const tblY = isVertical ? h * 0.17 : h * 0.19;

    // Contenedor principal con cristal escarchado oscuro
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;

    ctx.fillStyle = 'rgba(11, 17, 32, 0.96)';
    ctx.strokeStyle = '#263346';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(tblX, tblY, tblW, tblH, 14);
    ctx.fill();
    ctx.stroke();

    const numCols = Math.max(1, tbl.headers.length || 3);

    // CÁLCULO DE ANCHOS AUTOADAPTABLES SEGÚN EL CONTENIDO DE CADA COLUMNA
    const weights: number[] = [];
    tbl.headers.forEach((hdr, cIdx) => {
      let maxCharLength = hdr.length;
      tbl.rows.forEach((row) => {
        const cell = row[cIdx] || '';
        if (cell.length > maxCharLength) maxCharLength = cell.length;
      });
      // Ponderación: mínimo 14 caracteres de peso, raíz cuadrada para balancear texto largo
      weights.push(Math.max(12, Math.sqrt(maxCharLength) * 3.5));
    });

    const totalWeight = weights.reduce((acc, v) => acc + v, 0);
    const colWidths = weights.map((wt) => (wt / totalWeight) * tblW);

    // Cabecera de la tabla con gradiente y separadores
    const headerH = Math.round(tblH * 0.22);
    const headGrad = ctx.createLinearGradient(tblX, tblY, tblX, tblY + headerH);
    headGrad.addColorStop(0, '#1e293b');
    headGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.roundRect(tblX, tblY, tblW, headerH, [14, 14, 0, 0]);
    ctx.fill();

    // Título / Badge de la tabla en cabecera
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(h * 0.016)}px "Plus Jakarta Sans", sans-serif`;

    let colStartX = tblX;
    tbl.headers.forEach((hdr, cIdx) => {
      const cW = colWidths[cIdx];
      const cellCenterX = colStartX + cW / 2;

      // Columna 0 con icono distintivo
      if (cIdx === 0) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`📌 ${hdr.toUpperCase()}`, colStartX + 16, tblY + headerH * 0.62);
      } else {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(hdr.toUpperCase(), cellCenterX, tblY + headerH * 0.62);
      }

      // Línea divisoria vertical en cabecera
      if (cIdx > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(colStartX, tblY + 6);
        ctx.lineTo(colStartX, tblY + headerH - 6);
        ctx.stroke();
      }

      colStartX += cW;
    });

    // Filas autoadaptables con efecto cebra y detección inteligente de etiquetas (pills)
    const maxRows = Math.min(tbl.rows.length, isVertical ? 4 : 5);
    const rowH = (tblH - headerH) / Math.max(1, maxRows);
    const fontSize = Math.max(11, Math.round(h * 0.0145));
    ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;

    for (let rIdx = 0; rIdx < maxRows; rIdx++) {
      const row = tbl.rows[rIdx];
      const rY = tblY + headerH + rIdx * rowH;

      // Fondo cebra
      ctx.fillStyle = rIdx % 2 === 0 ? 'rgba(30, 41, 59, 0.45)' : 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(tblX, rY, tblW, rowH);

      // Divisor horizontal
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tblX, rY + rowH);
      ctx.lineTo(tblX + tblW, rY + rowH);
      ctx.stroke();

      let cellX = tblX;
      row.slice(0, numCols).forEach((cellText, cIdx) => {
        const cW = colWidths[cIdx];
        const textClean = cellText.trim();
        const textLower = textClean.toLowerCase();

        // Detección de badges / pills de seguridad (WPA3, WPA2, WEP, Inseguro, Recomendado, etc.)
        const isSecurityBadge =
          textLower.includes('wpa3') ||
          textLower.includes('wpa2') ||
          textLower.includes('wep') ||
          textLower.includes('inseguro') ||
          textLower.includes('seguro') ||
          textLower.includes('activo') ||
          textLower.includes('crítico') ||
          textLower.includes('vulnerable') ||
          textLower.includes('alta') ||
          textLower.includes('baja') ||
          textLower.includes('recomendado');

        if (isSecurityBadge && textClean.length < 18) {
          // Dibujar pill badge redondeado
          let pillBg = 'rgba(59, 130, 246, 0.2)';
          let pillBorder = '#3b82f6';
          let pillColor = '#93c5fd';

          if (textLower.includes('wpa3') || textLower.includes('recomendado') || textLower.includes('seguro') || textLower.includes('activo')) {
            pillBg = 'rgba(16, 185, 129, 0.25)';
            pillBorder = '#10b981';
            pillColor = '#6ee7b7';
          } else if (textLower.includes('wep') || textLower.includes('inseguro') || textLower.includes('crítico') || textLower.includes('vulnerable')) {
            pillBg = 'rgba(239, 68, 68, 0.25)';
            pillBorder = '#ef4444';
            pillColor = '#fca5a5';
          } else if (textLower.includes('wpa2') || textLower.includes('alta')) {
            pillBg = 'rgba(245, 158, 11, 0.25)';
            pillBorder = '#f59e0b';
            pillColor = '#fcd34d';
          }

          const pillW = Math.min(cW - 16, Math.max(68, ctx.measureText(textClean).width + 18));
          const pillH = Math.min(rowH * 0.72, 28);
          const pillCenterX = cellX + cW / 2;

          ctx.fillStyle = pillBg;
          ctx.strokeStyle = pillBorder;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(pillCenterX - pillW / 2, rY + (rowH - pillH) / 2, pillW, pillH, pillH / 2);
          ctx.fill();
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.fillStyle = pillColor;
          ctx.fillText(textClean, pillCenterX, rY + rowH / 2 + 5);
        } else {
          // Texto estándar o multi-línea
          if (cIdx === 0) {
            ctx.textAlign = 'left';
            ctx.fillStyle = '#38bdf8'; // Nombre de protocolo o sección en cyan
            ctx.fillText(textClean, cellX + 16, rY + rowH / 2 + 5);
          } else {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#e2e8f0'; // Contenido descriptivo en blanco perla

            // Multi-línea inteligente si excede el ancho disponible
            const maxChars = Math.floor(cW / (fontSize * 0.58));
            if (textClean.length > maxChars && textClean.includes(' ')) {
              const words = textClean.split(' ');
              const mid = Math.ceil(words.length / 2);
              const line1 = words.slice(0, mid).join(' ');
              const line2 = words.slice(mid).join(' ');
              ctx.fillText(line1, cellX + cW / 2, rY + rowH * 0.38 + 4);
              ctx.fillText(line2, cellX + cW / 2, rY + rowH * 0.72 + 4);
            } else {
              const textTrunc = textClean.length > maxChars ? textClean.substring(0, maxChars - 2) + '...' : textClean;
              ctx.fillText(textTrunc, cellX + cW / 2, rY + rowH / 2 + 5);
            }
          }
        }

        cellX += cW;
      });
    }

    ctx.restore();
  }

  // =========================================================================
  // TARJETA DE TEXTO RELEVANTE (Para diapositivas conceptuales estilo Anime)
  // =========================================================================
  public drawContextAnimeCard(
    sectionTitle: string,
    relevantText: string | undefined,
    isVertical: boolean,
    w: number,
    h: number
  ) {
    if (!relevantText) return;
    const { ctx } = this;
    ctx.save();

    const cardW = isVertical ? w * 0.88 : w * 0.74;
    const cardH = isVertical ? h * 0.32 : h * 0.38;
    const cardX = (w - cardW) / 2;
    const cardY = isVertical ? h * 0.18 : h * 0.20;

    // Cristal escarchado oscuro
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();

    // Título de la tarjeta
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f472b6';
    ctx.font = `800 ${Math.round(h * 0.017)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(`📌 ${sectionTitle.toUpperCase()}`, cardX + 22, cardY + 30);

    // Líneas o bullets
    const lines = relevantText.split('\n');
    let lineY = cardY + 58;
    const maxLines = isVertical ? 5 : 6;
    const fontSize = Math.max(11, Math.round(h * 0.015));
    ctx.font = `500 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#f1f5f9';

    for (const line of lines.slice(0, maxLines)) {
      if (line.trim().startsWith('•')) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('•', cardX + 22, lineY);
        ctx.fillStyle = '#f1f5f9';
        ctx.fillText(line.replace(/^•\s*/, ''), cardX + 36, lineY);
      } else {
        ctx.fillText(line, cardX + 22, lineY);
      }
      lineY += fontSize * 1.65;
    }

    ctx.restore();
  }
}
