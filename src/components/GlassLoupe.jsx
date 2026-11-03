import { useEffect, useImperativeHandle, useRef } from "react";

// Стеклянная линза на WebGL. В текстуре — снимок постера; шейдер для каждого
// пикселя линзы считает, куда «смотрит» луч через выпуклое стекло:
//   · в центре — равномерное увеличение;
//   · к краю картинка сжимается и затягивается (как в стеклянном шаре) —
//     так видно преломление окружающего;
//   · каждый цвет преломляется чуть по-своему (дисперсия) — радужная кайма;
//   · по нормали шара считаются блики, френелевская кромка и подсветка.
const VERT = `
attribute vec2 a;
varying vec2 vP;
void main() { vP = a; gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
varying vec2 vP;
uniform sampler2D uTex;
uniform vec2 uCenter;   // центр линзы в координатах постера (0..1)
uniform vec2 uRadius;   // радиус линзы в долях постера по x и y
uniform float uZoom;
uniform float uPx;      // размер пикселя в единицах r (для сглаживания края)
uniform float uRi;      // доля радиуса канвы, занятая стеклом (остальное — оправа)

vec3 sampleAt(vec2 off) {
  return texture2D(uTex, clamp(uCenter + off, vec2(0.0), vec2(1.0))).rgb;
}

void main() {
  vec2 po = vP;                // -1..1 по всей канве вместе с оправой, y вверх
  float ro = length(po);
  if (ro > 1.0) discard;

  // ── Оправа: полированное кольцо вокруг стекла ──────────────────────
  if (ro > uRi) {
    float t = (ro - uRi) / (1.0 - uRi);          // 0 у стекла … 1 у внешнего края
    vec2 dir0 = po / max(ro, 0.0001);
    float prof = cos(3.14159 * t);                // наклон профиля: +1 у стекла, −1 у внешнего края
    float lightSide = dot(dir0, normalize(vec2(-0.55, 0.83)));
    // сечение оправы — выпуклый валик: у стекла он «смотрит» к центру, у края — наружу
    float lit = -lightSide * prof;                // −1 (в тени) … +1 (под светом)
    float ang = atan(po.y, po.x);

    // глянцевый чёрный пластик: почти чёрный → графит → холодный отсвет;
    // полосы — отражение окружения
    vec3 deep = vec3(0.005, 0.005, 0.007);
    vec3 gold = vec3(0.055, 0.056, 0.063);
    vec3 pale = vec3(0.34, 0.35, 0.40);
    float e = lit * 0.5 + 0.5;
    e += 0.16 * sin(ang * 2.0 + 1.2) * (0.5 + 0.5 * abs(prof)); // полосы-отражения
    e = clamp(e, 0.0, 1.0);
    vec3 steel = e < 0.5 ? mix(deep, gold, smoothstep(0.0, 0.5, e)) : mix(gold, pale, smoothstep(0.5, 1.0, e));

    // острый зеркальный блик и гребень валика
    steel += vec3(0.95, 0.97, 1.0) * pow(max(lit, 0.0), 8.0) * 0.55;
    float ridge = exp(-pow((t - 0.5) / 0.13, 2.0));
    steel += vec3(0.85, 0.90, 1.0) * ridge * (0.05 + 0.50 * max(lightSide, 0.0));
    

    // тёмный жёлоб у стекла и тонкий тёмный контур снаружи — чтобы оправа читалась на белом
    steel *= 1.0 - 0.7 * (1.0 - smoothstep(0.0, 0.18, t));
    // тонкая светлая фаска по внешнему краю со стороны света — чтобы чёрное кольцо читалось
    steel += vec3(0.75, 0.78, 0.85) * smoothstep(0.80, 0.95, t) * (1.0 - smoothstep(0.95, 1.0, t)) * (0.1 + 0.6 * max(lightSide, 0.0));
    steel = mix(steel, vec3(0.0), smoothstep(0.96, 1.0, t) * 0.8);
    // мелкая полировочная риска вдоль окружности
    steel *= 0.97 + 0.03 * sin(ang * 140.0);
    float a = 1.0 - smoothstep(1.0 - uPx * 1.5, 1.0, ro);
    gl_FragColor = vec4(steel * a, a);
    return;
  }

  // ── Стекло ─────────────────────────────────────────────────────────
  vec2 p = po / uRi;           // -1..1 внутри стекла
  float r = length(p);

  // профиль стекла: линейно-увеличенный центр и круто закрученная кромка
  // центр (до ~72% радиуса) — ровное увеличение без искажений, читается как
  // обычная лупа; вся «стеклянность» собрана в узком ободке
  float edge = clamp((r - 0.72) / 0.28, 0.0, 1.0);
  float bend = 1.0 + 2.4 * pow(edge, 2.0);
  float d = (r / uZoom) * bend;
  vec2 dir = r > 0.0001 ? p / r : vec2(0.0);
  // texture y направлен вниз
  vec2 off = vec2(dir.x, -dir.y) * d * uRadius;

  // дисперсия: красный/зелёный/синий преломляются по-разному, сильнее у края
  float disp = 0.032 * smoothstep(0.80, 1.0, r);
  vec3 col = vec3(
    sampleAt(off * (1.0 - disp)).r,
    sampleAt(off).g,
    sampleAt(off * (1.0 + disp)).b
  );

  // нормаль выпуклой линзы
  float h = sqrt(max(1.0 - r * r, 0.0));
  vec3 n = normalize(vec3(p, h + 0.12));
  vec3 V = vec3(0.0, 0.0, 1.0);

  // основной источник — сверху слева
  vec3 L1 = normalize(vec3(-0.5, 0.65, 0.6));
  vec3 H1 = normalize(L1 + V);
  float rimZone = smoothstep(0.62, 0.9, r);
  float spec1 = pow(max(dot(n, H1), 0.0), 120.0) * rimZone;
  float sheen = pow(max(dot(n, H1), 0.0), 14.0) * 0.16 * rimZone;

  // встречный отсвет снизу справа (свет, прошедший через стекло)
  vec3 L2 = normalize(vec3(0.55, -0.7, 0.45));
  vec3 H2 = normalize(L2 + V);
  float spec2 = pow(max(dot(n, H2), 0.0), 60.0) * 0.55 * rimZone;

  // френелевская кромка: стекло у края светлее и голубоватее
  float fres = pow(1.0 - n.z, 3.2);
  vec3 rim = mix(vec3(1.0), vec3(0.78, 0.90, 1.0), 0.6) * fres * 0.75;

  // тонкая радужная плёнка у самого края
  float film = smoothstep(0.86, 0.96, r) * (1.0 - smoothstep(0.97, 1.0, r));
  vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + r * 3.2 + p.x * 0.6));
  col = mix(col, col * (0.8 + 0.4 * rainbow), film * 0.4);

  // стекло слегка затемняет толстую кромку: тень со стороны, противоположной свету
  float shade = smoothstep(0.78, 1.0, r) * (dot(normalize(p + vec2(0.0001)), vec2(0.6, -0.8)) * 0.5 + 0.5);
  col *= 1.0 - 0.20 * shade;

  col += rim + sheen + vec3(spec1) + vec3(spec2) * vec3(0.95, 0.97, 1.0);

  // внутренняя тёмная кайма у среза и сглаженная граница
  col = mix(col, col * 0.7, smoothstep(0.95, 1.0, r) * 0.7);
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
  return s;
}

// canvasSrc — снимок постера; posterW/posterH — размеры постера на экране,
// R — радиус линзы в экранных пикселях. Через ref: setCenter(px, py) —
// положение центра линзы в экранных пикселях постера.
export const RIM = 0.15; // толщина оправы в долях радиуса стекла

export default function GlassLoupe({ ref, source, posterW, posterH, R, zoom, onFail }) {
  const RO = R * (1 + RIM); // внешний радиус вместе с оправой
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const stateRef = useRef({ cx: 0.5, cy: 0.5, raf: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(RO * 2 * dpr);
    canvas.height = canvas.width;
    let gl;
    try {
      gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true });
      if (!gl) throw new Error("no webgl");
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "a");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.uniform1i(gl.getUniformLocation(prog, "uTex"), 0);
      gl.uniform2f(gl.getUniformLocation(prog, "uRadius"), R / posterW, R / posterH);
      gl.uniform1f(gl.getUniformLocation(prog, "uZoom"), zoom);
      gl.uniform1f(gl.getUniformLocation(prog, "uPx"), 1 / RO);
      gl.uniform1f(gl.getUniformLocation(prog, "uRi"), 1 / (1 + RIM));
      glRef.current = { gl, uCenter: gl.getUniformLocation(prog, "uCenter"), tex };
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    } catch {
      onFail?.();
      return undefined;
    }
    const st = stateRef.current;
    return () => {
      cancelAnimationFrame(st.raf);
      st.raf = 0;
      // контекст не теряем: React в dev запускает эффект дважды на том же canvas
      if (glRef.current) glRef.current.gl.deleteTexture(glRef.current.tex);
      glRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, posterW, posterH, R, zoom]);

  const draw = () => {
    const g = glRef.current;
    const st = stateRef.current;
    st.raf = 0;
    if (!g) return;
    const { gl, uCenter } = g;
    gl.uniform2f(uCenter, st.cx, st.cy);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  useImperativeHandle(ref, () => ({
    setCenter(px, py) {
      const st = stateRef.current;
      st.cx = px / posterW;
      st.cy = py / posterH;
      if (!st.raf) st.raf = requestAnimationFrame(draw);
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      style={{ width: RO * 2, height: RO * 2, display: "block", borderRadius: "50%" }}
      aria-hidden
    />
  );
}
