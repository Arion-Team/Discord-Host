import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FPS = 60;
const DURATION = 22;
const TOTAL_FRAMES = FPS * DURATION;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.min(Math.max(v, lo), hi); }
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t: number) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
function smoothstep(a: number, b: number, x: number) { const t = clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); }
function easeBack(t: number) { const c = 1.70158; return 1 + (c+1) * Math.pow(t-1,3) + c * Math.pow(t-1,2); }

interface Anim {
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, frame: number) => void;
}

function drawGradientBg(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number) {
  const t = frame / TOTAL_FRAMES;
  const hue1 = lerp(220, 260, t);
  const hue2 = lerp(200, 280, t);
  const ox = Math.sin(t * Math.PI * 2) * 100;
  const oy = Math.cos(t * Math.PI * 1.5) * 80;

  ctx.fillStyle = '#060608';
  ctx.fillRect(0, 0, w, h);

  const g1 = ctx.createRadialGradient(w*0.3+ox, h*0.4+oy, 0, w*0.3+ox, h*0.4+oy, w*0.5);
  g1.addColorStop(0, `hsla(${hue1}, 40%, 12%, 0.4)`);
  g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, h);

  const g2 = ctx.createRadialGradient(w*0.7-ox*0.5, h*0.6-oy*0.5, 0, w*0.7-ox*0.5, h*0.6-oy*0.5, w*0.4);
  g2.addColorStop(0, `hsla(${hue2}, 35%, 10%, 0.3)`);
  g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(w/2, h/2, w*0.2, w/2, h/2, w*0.75);
  g.addColorStop(0, 'transparent');
  g.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
}

function drawFilmGrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 16) {
    const n = (Math.random() - 0.5) * 12;
    d[i] += n;
    d[i+1] += n;
    d[i+2] += n;
  }
  ctx.putImageData(imgData, 0, 0);
}

function drawText(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  size: number, color: string, alpha: number, opts?: {
    font?: string; align?: CanvasTextAlign; spacing?: number; glow?: number;
    scale?: number; shadow?: string;
  }
) {
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.font = `${opts?.font || 'bold'} ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.textAlign = opts?.align || 'center';
  ctx.textBaseline = 'middle';
  if (opts?.spacing) ctx.letterSpacing = `${opts.spacing}px`;
  if (opts?.scale) {
    ctx.translate(x, y);
    ctx.scale(opts.scale, opts.scale);
    ctx.translate(-x, -y);
  }
  if (opts?.glow) {
    ctx.shadowColor = opts.shadow || color;
    ctx.shadowBlur = opts.glow;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);

  // Window bg
  drawRoundedRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = '#0c0c12';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Title bar
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.fillRect(x, y, w, 36);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.beginPath();
  ctx.moveTo(x, y + 36);
  ctx.lineTo(x + w, y + 36);
  ctx.stroke();

  // Traffic lights
  const cy = y + 18;
  [[20, '#ff5f57'], [36, '#febc2e'], [52, '#28c840']].forEach(([dx, c]) => {
    ctx.beginPath();
    ctx.arc(x + dx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.globalAlpha = clamp(alpha, 0, 0.8);
    ctx.fill();
    ctx.globalAlpha = clamp(alpha, 0, 1);
  });

  ctx.restore();
}

const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number; maxLife: number }> = [];
for (let i = 0; i < 50; i++) {
  particles.push({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - 0.5) * 0.0003,
    vy: -(Math.random() * 0.0008 + 0.0002),
    size: Math.random() * 2 + 0.5,
    alpha: Math.random() * 0.3 + 0.05,
    life: Math.random() * 300,
    maxLife: 300 + Math.random() * 200,
  });
}

function drawParticles(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number) {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life++;
    if (p.y < -0.05 || p.life > p.maxLife) {
      p.x = Math.random();
      p.y = 1.05;
      p.life = 0;
    }
    const fadeIn = Math.min(p.life / 40, 1);
    const fadeOut = 1 - Math.max((p.life - p.maxLife * 0.7) / (p.maxLife * 0.3), 0);
    const a = p.alpha * fadeIn * fadeOut;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fill();
  });
}

function drawFlash(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`;
  ctx.fillRect(0, 0, w, h);
}

function drawLetterbox(ctx: CanvasRenderingContext2D, w: number, h: number, open: number) {
  const barH = h * 0.08 * (1 - open);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, barH);
  ctx.fillRect(0, h - barH, w, barH);
}

function drawProgressBar(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number) {
  const barY = h * 0.92;
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, barY, w, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(0, barY, w * progress, 1);
}

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const startRef = useRef(performance.now());
  const rafRef = useRef<number>();
  const [done, setDone] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const audioRef = useRef<{ ctx: AudioContext; master: GainNode; nodes: AudioNode[] } | null>(null);

  useEffect(() => {
    fetch('/api/branding')
      .then(r => r.json())
      .then(data => {
        const val = data?.settings?.welcomeAnimation;
        if (val === 'false') {
          navigate('/dashboard', { replace: true });
        }
      })
      .catch(() => {});
  }, [navigate]);

  // Start ambient music
  useEffect(() => {
    try {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = 0.3;
      master.connect(ctx.destination);

      // Deep drone
      const drone = ctx.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = 55;
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.15;
      drone.connect(droneGain).connect(master);
      drone.start();

      // Second drone (fifth above)
      const drone2 = ctx.createOscillator();
      drone2.type = 'sine';
      drone2.frequency.value = 82.5;
      const drone2Gain = ctx.createGain();
      drone2Gain.gain.value = 0.08;
      drone2.connect(drone2Gain).connect(master);
      drone2.start();

      // Atmospheric pad with LFO
      const pad = ctx.createOscillator();
      pad.type = 'sine';
      pad.frequency.value = 110;
      const padGain = ctx.createGain();
      padGain.gain.value = 0.06;
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.15;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 3;
      lfo.connect(lfoGain).connect(pad.frequency);
      lfo.start();
      pad.connect(padGain).connect(master);
      pad.start();

      // High shimmer
      const shimmer = ctx.createOscillator();
      shimmer.type = 'sine';
      shimmer.frequency.value = 440;
      const shimmerGain = ctx.createGain();
      shimmerGain.gain.value = 0;
      const shimmerLfo = ctx.createOscillator();
      shimmerLfo.type = 'sine';
      shimmerLfo.frequency.value = 0.08;
      const shimmerLfoGain = ctx.createGain();
      shimmerLfoGain.gain.value = 0.03;
      shimmerLfo.connect(shimmerLfoGain).connect(shimmerGain.gain);
      shimmerLfo.start();
      shimmer.connect(shimmerGain).connect(master);
      shimmer.start();

      // Subtle noise (breathing)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.02;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 200;
      noise.connect(noiseFilter).connect(master);
      noise.start();

      // Sparkle notes
      const sparkle = () => {
        if (ctx.state === 'closed') return;
        const freq = [523, 659, 784, 880, 1047, 1319][Math.floor(Math.random() * 6)];
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = 0;
        g.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 0.1);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5);
        osc.connect(g).connect(master);
        osc.start();
        osc.stop(ctx.currentTime + 3);
        setTimeout(sparkle, 2000 + Math.random() * 5000);
      };
      setTimeout(sparkle, 3000);

      audioRef.current = { ctx, master, nodes: [drone, drone2, pad, lfo, shimmer, shimmerLfo, noise] };
    } catch (e) {
      // Audio not supported, skip silently
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.ctx.close().catch(() => {});
      }
    };
  }, []);

  // Mute toggle
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.master.gain.linearRampToValueAtTime(
        muted ? 0 : 0.3,
        audioRef.current.ctx.currentTime + 0.3
      );
    }
  }, [muted]);

  const skip = useCallback(() => {
    setDone(true);
    setTimeout(() => navigate('/dashboard', { replace: true }), 400);
  }, [navigate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    const render = () => {
      const now = performance.now();
      const elapsedSec = (now - startRef.current) / 1000;
      const frame = Math.floor(elapsedSec * FPS);

      if (frame >= TOTAL_FRAMES) {
        setDone(true);
        setTimeout(() => navigate('/dashboard', { replace: true }), 600);
        return;
      }

      frameRef.current = frame;
      elapsedRef.current = elapsedSec;
      if (frame % 15 === 0) setElapsed(elapsedSec);
      const t = elapsedSec;
      const progress = elapsed / DURATION;
      const w = W();
      const h = H();

      ctx.clearRect(0, 0, w, h);

      // 1. Background
      drawGradientBg(ctx, w, h, frame);

      // 2. Particles
      drawParticles(ctx, w, h, frame);

      // 3. Vignette
      drawVignette(ctx, w, h);

      // ===== SCENES =====

      // FLASH calculation
      const flashes = [2.5, 4.5, 6.5, 9, 11, 13.5, 16];
      let flashAlpha = 0;
      for (const ft of flashes) {
        if (t > ft - 0.05 && t < ft + 0.3) {
          flashAlpha = Math.max(flashAlpha, smoothstep(ft - 0.05, ft, t) * (1 - smoothstep(ft, ft + 0.3, t)));
        }
      }

      // Letterbox
      drawLetterbox(ctx, w, h, smoothstep(0, 1.5, t));

      // === SCENE 1: TITLE CARD (0-2.5) ===
      if (t < 3) {
        const a = smoothstep(0.5, 1.2, t) * (1 - smoothstep(2, 2.8, t));
        const s = 0.85 + easeOut(clamp((t - 0.5) / 1, 0, 1)) * 0.15;
        drawText(ctx, 'DISCORDHOST', w/2, h/2 - 15, 72, '#fff', a, { font: '900', glow: 60, scale: s, shadow: 'rgba(255,255,255,0.15)' });
        drawText(ctx, 'presents', w/2, h/2 + 40, 14, '#666', smoothstep(1, 1.5, t) * (1 - smoothstep(2, 2.5, t)), { spacing: 6 });
      }

      // === SCENE 2: "BUILD" (2.5-4.5) ===
      if (t > 2.3 && t < 4.8) {
        const a = smoothstep(2.5, 3, t) * (1 - smoothstep(4.2, 4.8, t));
        drawText(ctx, 'BUILD', w/2, h/2, 80, '#fff', a, { font: '900', glow: 40, shadow: 'rgba(255,255,255,0.1)' });

        // Floating code snippets
        const snippets = [
          { text: 'import { Client }', x: 0.2, y: 0.25, at: 3.0, rot: -3 },
          { text: 'bot.on("ready")', x: 0.7, y: 0.35, at: 3.3, rot: 2 },
          { text: 'console.log("online")', x: 0.25, y: 0.7, at: 3.6, rot: -1 },
          { text: 'bot.login(TOKEN)', x: 0.65, y: 0.75, at: 3.9, rot: 3 },
        ];
        for (const sn of snippets) {
          const sa = smoothstep(sn.at, sn.at + 0.1, t) * (1 - smoothstep(sn.at + 0.35, sn.at + 0.5, t));
          if (sa > 0) {
            ctx.save();
            ctx.translate(sn.x * w, sn.y * h);
            ctx.rotate(sn.rot * Math.PI / 180);
            drawText(ctx, sn.text, 0, 0, 16, '#4ade80', sa * 0.5, { font: '400', align: 'center', glow: 15, shadow: 'rgba(74,222,128,0.3)' });
            ctx.restore();
          }
        }
      }

      // === SCENE 3: CODE EDITOR (4.5-6.5) ===
      if (t > 4.3 && t < 6.8) {
        const vis = smoothstep(4.5, 5, t) * (1 - smoothstep(6.2, 6.8, t));
        const wx = w * 0.5 - Math.min(w * 0.45, 500);
        const wy = h * 0.15;
        const ww = Math.min(w * 0.9, 1000);
        const wh = h * 0.7;

        drawWindow(ctx, wx, wy, ww, wh, vis);

        // Code typing
        const codeLines = [
          'import { Client } from "discord.js";',
          '',
          'const bot = new Client({',
          '  intents: ["Guilds"],',
          '});',
          '',
          'bot.on("ready", () => {',
          '  console.log(`Online`);',
          '});',
          '',
          'bot.login(process.env.TOKEN);',
        ];
        const codeT = clamp((t - 5) / 1.1, 0, 1);
        const totalCh = codeLines.join('').length;
        const typed = Math.floor(easeOut(codeT) * totalCh);

        let charCount = 0;
        const lineH = 28;
        const startY = wy + 55;

        ctx.save();
        ctx.beginPath();
        ctx.rect(wx, wy + 36, ww, wh - 36);
        ctx.clip();

        codeLines.forEach((line, li) => {
          const before = codeLines.slice(0, li).join('').length;
          const vis2 = clamp(typed - before, 0, line.length);
          if (before >= typed && line.length > 0) return;

          const ly = startY + li * lineH;
          if (ly > wy + wh) return;

          // Line number
          drawText(ctx, `${li + 1}`, wx + 35, ly, 11, '#444', vis * 0.5, { font: '400', align: 'right' });

          // Code text
          let cx = wx + 55;
          const isKw = /^(import|from|const|new|return)$/.test(line.trim().split(/[^a-zA-Z]/)[0]);

          for (let ci = 0; ci < vis2; ci++) {
            const ch = line[ci];
            let color = '#d4d4d4';
            if (isKw && ci < 12) color = '#c084fc';
            else if (ch === '"' || ch === '`') color = '#4ade80';
            else if (ch === '.') color = '#facc15';

            ctx.save();
            ctx.globalAlpha = vis;
            ctx.font = '12px "SF Mono", "Fira Code", "Consolas", monospace';
            ctx.fillStyle = color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(ch, cx, ly);
            cx += ctx.measureText(ch).width;
            ctx.restore();
          }

          // Cursor
          if (typed >= before && typed < before + line.length && codeT < 0.98) {
            ctx.save();
            ctx.globalAlpha = vis * (Math.floor(t * 3) % 2 === 0 ? 0.8 : 0);
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx + 1, ly - 8, 2, 16);
            ctx.restore();
          }
        });
        ctx.restore();

        // Tab labels
        if (vis > 0.3) {
          drawText(ctx, 'bot.js', wx + 100, wy + 18, 11, '#aaa', vis, { font: '400', align: 'left' });
        }
      }

      // === SCENE 4: "DEPLOY" (6.5-9) ===
      if (t > 6.3 && t < 9.3) {
        const a = smoothstep(6.5, 7, t) * (1 - smoothstep(8.7, 9.3, t));
        drawText(ctx, 'DEPLOY', w/2, h/2 - 20, 80, '#fff', a, { font: '900', glow: 40, shadow: 'rgba(255,255,255,0.1)' });
        drawText(ctx, 'one command', w/2, h/2 + 35, 14, '#666', smoothstep(7, 7.5, t) * a, { spacing: 4 });
      }

      // === SCENE 5: TERMINAL (9-11.5) ===
      if (t > 8.8 && t < 11.8) {
        const vis = smoothstep(9, 9.5, t) * (1 - smoothstep(11.2, 11.8, t));
        const wx = w * 0.5 - Math.min(w * 0.4, 420);
        const wy = h * 0.2;
        const ww = Math.min(w * 0.8, 840);
        const wh = h * 0.6;

        drawWindow(ctx, wx, wy, ww, wh, vis);

        // Green tint for terminal
        ctx.save();
        ctx.globalAlpha = vis * 0.02;
        ctx.fillStyle = '#4ade80';
        drawRoundedRect(ctx, wx, wy, ww, wh, 12);
        ctx.fill();
        ctx.restore();

        const termLines = [
          { text: '$ discordhost deploy', at: 9.3, c: '#4ade80' },
          { text: 'installing 142 packages...', at: 9.6, c: '#666' },
          { text: '✓ Build successful (1.2s)', at: 10.0, c: '#4ade80' },
          { text: '✓ Deploying to production...', at: 10.3, c: '#4ade80' },
          { text: '✓ Bot is live', at: 10.7, c: '#4ade80' },
          { text: '✓ 3 guilds · 1.2k users', at: 11.0, c: '#4ade80' },
        ];

        let ty = wy + 55;
        termLines.forEach((line, i) => {
          const la = smoothstep(line.at, line.at + 0.15, t);
          if (la <= 0) return;
          const ly = ty + i * 32;
          if (line.text.startsWith('$')) {
            drawText(ctx, '❯', wx + 30, ly, 12, '#4ade80', la * vis, { font: '400', align: 'left' });
            drawText(ctx, line.text.slice(2), wx + 50, ly, 12, '#86efac', la * vis, { font: '400', align: 'left' });
          } else {
            drawText(ctx, line.text, wx + 30, ly, 12, line.c, la * vis, { font: '400', align: 'left', glow: line.text.startsWith('✓') ? 8 : 0, shadow: 'rgba(74,222,128,0.3)' });
          }
        });
      }

      // === SCENE 6: "SCALE" (11-13.5) ===
      if (t > 10.8 && t < 13.8) {
        const a = smoothstep(11, 11.5, t) * (1 - smoothstep(13.3, 13.8, t));
        drawText(ctx, 'SCALE', w/2, h/2 - 60, 80, '#fff', a, { font: '900', glow: 40, shadow: 'rgba(255,255,255,0.1)' });

        const stats = [
          { text: '99.9%', sub: 'UPTIME', x: w * 0.25, c: '#4ade80', at: 11.5 },
          { text: '<50ms', sub: 'LATENCY', x: w * 0.5, c: '#60a5fa', at: 11.8 },
          { text: '24/7', sub: 'MONITORING', x: w * 0.75, c: '#facc15', at: 12.1 },
        ];
        stats.forEach(s => {
          const sa = smoothstep(s.at, s.at + 0.4, t) * a;
          if (sa > 0) {
            drawText(ctx, s.text, s.x, h/2 + 30, 42, s.c, sa, { font: '900', glow: 25, shadow: `${s.c}44` });
            drawText(ctx, s.sub, s.x, h/2 + 65, 10, '#555', sa, { spacing: 4 });
          }
        });
      }

      // === SCENE 7: DASHBOARD (13.5-16) ===
      if (t > 13.3 && t < 16.3) {
        const vis = smoothstep(13.5, 14, t) * (1 - smoothstep(15.8, 16.3, t));
        const dw = Math.min(w * 0.85, 900);
        const dh = Math.min(h * 0.7, 480);
        const dx = (w - dw) / 2;
        const dy = (h - dh) / 2;

        // Dashboard background
        ctx.save();
        ctx.globalAlpha = vis;
        drawRoundedRect(ctx, dx, dy, dw, dh, 12);
        ctx.fillStyle = '#0c0c12';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // Sidebar
        const sideW = 160;
        const sideA = smoothstep(14, 14.5, t) * vis;
        ctx.save();
        ctx.globalAlpha = sideA;
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(dx, dy, sideW, dh);
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.beginPath();
        ctx.moveTo(dx + sideW, dy);
        ctx.lineTo(dx + sideW, dy + dh);
        ctx.stroke();
        ctx.restore();

        // Sidebar items
        ['Dashboard', 'My Bots', 'Files', 'Settings'].forEach((item, i) => {
          const ia = smoothstep(14.2 + i * 0.1, 14.5 + i * 0.1, t) * vis;
          if (ia > 0) {
            const iy = dy + 50 + i * 36;
            if (i === 0) {
              ctx.save();
              ctx.globalAlpha = ia * 0.06;
              drawRoundedRect(ctx, dx + 8, iy - 12, sideW - 16, 28, 6);
              ctx.fillStyle = '#fff';
              ctx.fill();
              ctx.restore();
            }
            drawText(ctx, item, dx + sideW / 2, iy, 11, i === 0 ? '#fff' : '#555', ia, { font: '400' });
          }
        });

        // Stat cards
        const stats = [
          { l: 'BOTS', v: '5', c: '#60a5fa', at: 14.3 },
          { l: 'ONLINE', v: '3', c: '#4ade80', at: 14.5 },
          { l: 'UPTIME', v: '99.9%', c: '#facc15', at: 14.7 },
        ];
        const cardW = (dw - sideW - 60) / 3;
        stats.forEach((s, i) => {
          const sa = smoothstep(s.at, s.at + 0.3, t) * vis;
          if (sa > 0) {
            const cx = dx + sideW + 20 + i * (cardW + 10);
            const cy = dy + 25;
            const ch = 80;
            ctx.save();
            ctx.globalAlpha = sa;
            drawRoundedRect(ctx, cx, cy, cardW, ch, 8);
            ctx.fillStyle = `${s.c}08`;
            ctx.fill();
            ctx.strokeStyle = `${s.c}15`;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
            drawText(ctx, s.l, cx + cardW/2, cy + 22, 9, '#555', sa, { font: '400' });
            drawText(ctx, s.v, cx + cardW/2, cy + 52, 24, s.c, sa, { font: '900', glow: 15, shadow: `${s.c}33` });
          }
        });

        // Bot rows
        ['MyBot', 'GameBot', 'MusicBot'].forEach((name, i) => {
          const ba = smoothstep(14.8 + i * 0.12, 15.1 + i * 0.12, t) * vis;
          if (ba > 0) {
            const bx = dx + sideW + 15;
            const by = dy + 130 + i * 42;
            const bw = dw - sideW - 30;
            const bh = 35;
            ctx.save();
            ctx.globalAlpha = ba;
            drawRoundedRect(ctx, bx, by, bw, bh, 6);
            ctx.fillStyle = 'rgba(255,255,255,0.015)';
            ctx.fill();
            ctx.restore();
            drawText(ctx, name, bx + 40, by + bh/2, 11, '#ddd', ba, { font: '400', align: 'left' });
            // Green dot
            ctx.save();
            ctx.globalAlpha = ba;
            ctx.beginPath();
            ctx.arc(bx + bw - 30, by + bh/2, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#4ade80';
            ctx.fill();
            ctx.restore();
            drawText(ctx, 'Online', bx + bw - 50, by + bh/2, 9, '#555', ba, { font: '400', align: 'right' });
          }
        });
      }

      // === SCENE 8: LOGO + CTA (16-22) ===
      if (t > 15.8) {
        const a = smoothstep(16, 17, t);

        // Logo box
        const logoSize = 80;
        const logoX = w/2;
        const logoY = h/2 - 60;
        const logoScale = easeBack(clamp((t - 16) / 0.8, 0, 1));

        ctx.save();
        ctx.translate(logoX, logoY);
        ctx.scale(logoScale, logoScale);
        ctx.globalAlpha = a;
        drawRoundedRect(ctx, -logoSize/2, -logoSize/2, logoSize, logoSize, 16);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Glow
        ctx.shadowColor = 'rgba(255,255,255,0.2)';
        ctx.shadowBlur = 50 + Math.sin(t * 2) * 20;
        drawRoundedRect(ctx, -logoSize/2, -logoSize/2, logoSize, logoSize, 16);
        ctx.fill();
        ctx.restore();

        // D letter
        drawText(ctx, 'D', logoX, logoY, 38, '#000', a, { font: '900', scale: logoScale });

        // Title
        drawText(ctx, 'DISCORDHOST', w/2, h/2 + 50, 56, '#fff', smoothstep(16.5, 17.2, t), {
          font: '900', glow: 40, shadow: 'rgba(255,255,255,0.1)', spacing: 4
        });

        // Subtitle
        drawText(ctx, 'Professional Bot Hosting', w/2, h/2 + 90, 14, '#555', smoothstep(17, 17.5, t), { spacing: 3 });

        // Button
        const btnA = smoothstep(17.5, 18.2, t);
        if (btnA > 0) {
          const btnW = 200;
          const btnH = 48;
          const btnX = w/2 - btnW/2;
          const btnY = h/2 + 120;
          ctx.save();
          ctx.globalAlpha = btnA;
          drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 10);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.restore();
          drawText(ctx, 'Get Started', w/2, btnY + btnH/2, 13, '#000', btnA, { font: '600' });
        }
      }

      // Scanlines
      drawScanlines(ctx, w, h, frame);

      // Flash
      drawFlash(ctx, w, h, flashAlpha);

      // Progress bar
      drawProgressBar(ctx, w, h, progress);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 bg-black z-50 transition-opacity duration-500 ${done ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <canvas ref={canvasRef} className="w-full h-full" style={{ imageRendering: 'auto' }} />

      {/* Real clickable Get Started button - appears at end of animation */}
      {elapsed > 17.5 && !done && (
        <button
          onClick={(e) => { e.stopPropagation(); skip(); }}
          className="absolute z-[70] px-10 py-3.5 rounded-xl text-sm font-semibold text-black bg-white hover:bg-gray-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            left: '50%',
            top: 'calc(50% + 120px)',
            transform: 'translateX(-50%)',
            opacity: Math.min((elapsed - 17.5) * 2, 1),
            boxShadow: '0 0 50px rgba(255,255,255,0.1), 0 15px 40px rgba(0,0,0,0.4)',
          }}
        >
          Get Started
        </button>
      )}
      {!done && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
            className="fixed top-5 right-[90px] z-[100] px-3 py-2 rounded-lg text-[11px] font-mono text-gray-500 hover:text-white hover:bg-white/5 transition-all border border-white/5 hover:border-white/10"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); skip(); }}
            className="fixed top-5 right-5 z-[100] px-4 py-2 rounded-lg text-[11px] font-mono text-gray-500 hover:text-white hover:bg-white/5 transition-all border border-white/5 hover:border-white/10"
          >
            SKIP →
          </button>
        </>
      )}
    </div>
  );
};

export default WelcomePage;
