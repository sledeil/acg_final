export const BlackHoleShader = {
  uniforms: { "tDiffuse": { value: null } },
  vertexShader: `
    varying vec2 vUv;
    void main(){ 
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main(){
      vec2 uv = vUv - 0.5;
      float r = length(uv);
      uv += uv*0.2/(r*r+0.001); // 光线弯曲
      vec4 color = texture2D(tDiffuse, uv+0.5);
      gl_FragColor = color;
    }
  `
};
