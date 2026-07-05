export const VERTEX_SHADER = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

/**
 * Fundo vivo em shader único (custo de GPU ~constante, sem loop de física em JS).
 * Conceito: nutrientes suspensos com deriva orgânica (Lissajous, nunca "caindo"),
 * com pulsos raros de absorção, sobre um brilho de solo que respira bem devagar
 * perto da borda inferior. Tudo derivado só de uTime — sem estado por frame.
 */
export const FRAGMENT_SHADER = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uIntensity;
  uniform float uPointCount;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;

  const int MAX_PONTOS = 24;

  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / uResolution.y;
    vec2 uvA = vec2(uv.x * aspect, uv.y);

    vec3 acumulado = vec3(0.0);

    for (int i = 0; i < MAX_PONTOS; i++) {
      if (float(i) >= uPointCount) break;

      float seed = float(i) * 19.31;

      vec2 base = vec2(hash(seed), hash(seed + 1.0) * 0.68);
      float freqX = 0.06 + hash(seed + 2.0) * 0.10;
      float freqY = 0.05 + hash(seed + 3.0) * 0.09;
      float faseX = hash(seed + 4.0) * 6.283;
      float faseY = hash(seed + 5.0) * 6.283;
      float ampX = 0.05 + hash(seed + 6.0) * 0.06;
      float ampY = 0.04 + hash(seed + 7.0) * 0.05;

      vec2 pos = base + vec2(
        sin(uTime * freqX + faseX) * ampX,
        sin(uTime * freqY + faseY) * ampY
      );
      pos.x *= aspect;

      float distancia = distance(uvA, pos);
      float raio = 0.006 + hash(seed + 8.0) * 0.007;
      float glow = exp(-(distancia * distancia) / (raio * raio));

      float faseAbsorcao = hash(seed + 9.0) * 200.0;
      float freqAbsorcao = 0.035 + hash(seed + 10.0) * 0.03;
      float bruto = sin(uTime * freqAbsorcao + faseAbsorcao) * 0.5 + 0.5;
      float pulso = pow(bruto, 7.0);

      vec3 cor = mix(uColorA, uColorB, hash(seed + 11.0));
      cor = mix(cor, uColorC, step(0.72, hash(seed + 12.0)));

      acumulado += cor * glow * (0.22 + pulso * 0.62);
    }

    vec2 soloPos = vec2(0.5 * aspect, 0.05);
    float distSolo = distance(uvA, soloPos);
    float glowSolo = exp(-(distSolo * distSolo) / (0.22 * 0.22));
    float respirar = sin(uTime * 0.09) * 0.5 + 0.5;
    acumulado += uColorA * glowSolo * 0.045 * (0.4 + respirar * 0.6);

    acumulado *= uIntensity;
    float alpha = clamp(length(acumulado) * 1.4, 0.0, 1.0);

    gl_FragColor = vec4(acumulado, alpha);
  }
`
