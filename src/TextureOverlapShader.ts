export const TextureOverlapShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'overlappedTexture': { value: null },
    'rate': { value: 0.5 },
    'aspect': { value: 1.0 }
  },
  vertexShader: `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
  `,
  fragmentShader: `
uniform sampler2D tDiffuse;
uniform sampler2D overlappedTexture;
uniform float rate;
uniform float aspect;

varying vec2 vUv;

// from: https://github.com/mrdoob/three.js/blob/205e345b4f48f8b560b3b35391fd914cba1997a0/src/renderers/shaders/ShaderChunk/encodings_pars_fragment.glsl.js#L16C23-L16C23
vec4 sRGBToLinear(in vec4 value) {
  return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}

void main() {
  vec3 v1 = texture2D(tDiffuse, vUv).rgb;

  vec2 uv = aspect > 1.0
    ? vec2(vUv.x, (vUv.y - 0.5) / aspect + 0.5) // landspace
    : vec2((vUv.x - 0.5) * aspect + 0.5, vUv.y); // portrait
  vec3 v2 = sRGBToLinear(texture2D(overlappedTexture, uv)).rgb;
  gl_FragColor = vec4(mix(v1, v2, rate), 1.0);
}
  `
}