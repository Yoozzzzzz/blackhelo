import * as THREE from 'three';

export type DissolveHandle = {
  material: THREE.MeshStandardMaterial;
  depthMaterial: THREE.MeshDepthMaterial;
  dissolve: { value: number };
  time: { value: number };
};

function decorate(material: THREE.Material, handle: DissolveHandle, withEdge: boolean) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uDissolve = handle.dissolve;
    shader.uniforms.uHeight = { value: handle.material.userData.dissolveHeight as number };
    shader.uniforms.uTime = handle.time;

    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        'varying float vDissolveY; varying vec3 vDissolvePosition;\nvoid main() {'
      )
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n\tvDissolveY = transformed.y;\n\tvDissolvePosition = transformed;'
      );

    const fragmentPreamble = `
      varying float vDissolveY;
      varying vec3 vDissolvePosition;
      uniform float uDissolve;
      uniform float uHeight;
      uniform float uTime;
    `;
    const fragmentLogic = `
      float dissolveNoise = sin(dot(vDissolvePosition.xz, vec2(2.7, 3.1)) + uTime * 1.6) * 0.045
        + sin(dot(vDissolvePosition.xz, vec2(-4.2, 1.8)) - uTime * 1.1) * 0.025;
      float dissolveThreshold = uDissolve * uHeight
        + dissolveNoise * uHeight * smoothstep(0.0, 0.3, uDissolve);
      if (vDissolveY < dissolveThreshold) discard;
    `;
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `${fragmentPreamble}\nvoid main() {\n${fragmentLogic}`);
    if (withEdge) {
      shader.fragmentShader = shader.fragmentShader.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec4 diffuseColor = vec4( diffuse, opacity );
        float dissolveEdge = (1.0 - smoothstep(0.0, uHeight * 0.18, abs(vDissolveY - dissolveThreshold)))
          * smoothstep(0.0, 0.08, uDissolve);
        diffuseColor.rgb += vec3(0.58, 0.16, 1.0) * dissolveEdge * 1.8;`
      );
    }
  };
  material.customProgramCacheKey = () => withEdge ? 'building-dissolve-v2' : 'building-dissolve-depth-v2';
}

export function createDissolveMaterials(color: THREE.ColorRepresentation, height: number): DissolveHandle {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.08 });
  const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  const handle = {
    material,
    depthMaterial,
    dissolve: { value: 0 },
    time: { value: 0 },
  } satisfies DissolveHandle;
  material.userData.dissolveHeight = height;
  decorate(material, handle, true);
  decorate(depthMaterial, handle, false);
  return handle;
}

