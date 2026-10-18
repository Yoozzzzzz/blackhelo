import * as THREE from 'three';
import './style.css';
import { config } from './config';
import { createDissolveMaterials, type DissolveHandle } from './dissolve';

type ItemKind = 'building' | 'car' | 'tree';
type Item = {
  group: THREE.Group;
  kind: ItemKind;
  size: number;
  gone: boolean;
  absorbing: boolean;
  progress: number;
  occlusion: number;
  dissolve?: DissolveHandle;
};

const mapSize = config.mapSize;
const cityHalf = Math.max(5, Math.floor(mapSize * 0.3 / 5) * 5);
const roadSpacing = mapSize / 11;
const roadLength = mapSize * 0.64;
const targetLimit = mapSize * 0.31;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b1230');
scene.fog = new THREE.Fog('#0b1230', mapSize * 0.38, mapSize * 1.14);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, mapSize * 1.45);
const cameraOffset = new THREE.Vector3(18, 24, 28);
const cameraFocus = new THREE.Vector3();
camera.position.copy(cameraOffset);
camera.lookAt(cameraFocus);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.domElement.setAttribute('aria-label', '黑洞吞噬城市 3D 游戏画面');
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x1a2142, 1.8));
const sun = new THREE.DirectionalLight(0xffd8b5, 3.4);
sun.position.set(-15, 28, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = mapSize * 1.09;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(mapSize, mapSize),
  new THREE.MeshStandardMaterial({ color: '#263d59', roughness: 0.94, metalness: 0.05 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.08;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(mapSize, Math.round(mapSize / 2), '#56718b', '#314b66');
grid.position.y = -0.05;
scene.add(grid);
const roadMaterial = new THREE.MeshStandardMaterial({ color: '#172337', roughness: 0.82 });
for (let i = -3; i <= 3; i++) {
  for (const [x, z, w, d] of [[i * roadSpacing, 0, 1.5, roadLength], [0, i * roadSpacing, roadLength, 1.5]] as number[][]) {
    const road = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), roadMaterial);
    road.position.set(x, 0, z);
    road.receiveShadow = true;
    scene.add(road);
  }
}

const items: Item[] = [];
const buildingColors = ['#d9b99b', '#b8c6d9', '#d8d6c7', '#c4b5d9', '#e4c6a6', '#a8c9c3'];
const carColors = ['#e85d5d', '#f4c95d', '#4e8edb', '#f0f0e8', '#4caa83'];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function addBuilding(x: number, z: number, w: number, d: number, h: number) {
  const group = new THREE.Group();
  const dissolve = createDissolveMaterials(buildingColors[Math.floor(Math.random() * buildingColors.length)], h);
  const bodyGeometry = new THREE.BoxGeometry(w, h, d);
  bodyGeometry.translate(0, h / 2, 0);
  const body = new THREE.Mesh(bodyGeometry, dissolve.material);
  body.castShadow = true;
  body.receiveShadow = true;
  body.customDepthMaterial = dissolve.depthMaterial;
  group.add(body);
  if (h > 5) {
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.35, 0.35, d * 0.35),
      new THREE.MeshStandardMaterial({ color: '#52647e', roughness: 0.62, metalness: 0.18 })
    );
    roof.position.y = h + 0.17;
    roof.castShadow = true;
    group.add(roof);
  }
  group.position.set(x, 0, z);
  scene.add(group);
  items.push({ group, kind: 'building', size: Math.max(w, d, h * 0.38), gone: false, absorbing: false, progress: 0, occlusion: 0, dissolve });
}

function addCar(x: number, z: number) {
  const group = new THREE.Group();
  const color = carColors[Math.floor(Math.random() * carColors.length)];
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.55, 0.82),
    new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.36 })
  );
  base.position.y = 0.42;
  base.castShadow = true;
  group.add(base);
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.42, 0.66),
    new THREE.MeshStandardMaterial({ color: '#bcd9e8', metalness: 0.12, roughness: 0.2 })
  );
  top.position.set(-0.05, 0.86, 0);
  group.add(top);
  group.position.set(x, 0, z);
  scene.add(group);
  items.push({ group, kind: 'car', size: 1.05, gone: false, absorbing: false, progress: 0, occlusion: 0 });
}

function addTree(x: number, z: number) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.18, 0.8, 7),
    new THREE.MeshStandardMaterial({ color: '#795548', roughness: 0.9 })
  );
  trunk.position.y = 0.4;
  group.add(trunk);
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.75, 1),
    new THREE.MeshStandardMaterial({ color: '#4f9670', flatShading: true, roughness: 0.9 })
  );
  crown.position.y = 1.2;
  crown.castShadow = true;
  group.add(crown);
  group.position.set(x, 0, z);
  scene.add(group);
  items.push({ group, kind: 'tree', size: 1.1, gone: false, absorbing: false, progress: 0, occlusion: 0 });
}

for (let x = -cityHalf; x <= cityHalf; x += 5) {
  for (let z = -cityHalf; z <= cityHalf; z += 5) {
    if (Math.abs(x % 10) < 2 || Math.abs(z % 10) < 2) continue;
    if (Math.random() < 0.18) {
      addTree(x + rand(-1, 1), z + rand(-1, 1));
      continue;
    }
    const w = rand(1.5, 2.9), d = rand(1.5, 2.9), h = rand(2.5, 10);
    addBuilding(x + rand(-1, 1), z + rand(-1, 1), w, d, h);
    if (Math.random() < 0.8) addCar(x + rand(-2, 2), z + rand(-2, 2));
  }
}

function createBlackHole() {
  const group = new THREE.Group();
  const disk = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: '#030208' }));
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = 0.05;
  group.add(disk);
  const accretion = new THREE.Mesh(
    new THREE.RingGeometry(0.48, 1.5, 96, 18),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `varying vec2 vUv; uniform float uTime; void main(){vec2 p=vUv-.5;float r=length(p)*2.;float a=atan(p.y,p.x);float bands=.5+.5*sin(a*8.-uTime*3.2+r*16.);float rim=smoothstep(1.,.58,r)*smoothstep(.1,.42,r);vec3 col=mix(vec3(.35,.05,.95),vec3(1.,.22,.64),bands);gl_FragColor=vec4(col*(.7+bands*.8),rim*.78);}`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  accretion.rotation.x = -Math.PI / 2;
  accretion.position.y = 0.1;
  group.add(accretion);
  for (const [radius, tube, opacity] of [[1.08, 0.09, 0.9], [1.28, 0.045, 0.36], [0.68, 0.022, 0.5]] as number[][]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 16, 96),
      new THREE.MeshBasicMaterial({ color: '#b66dff', transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.13 + tube * 0.4;
    group.add(ring);
  }
  const particlePositions = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = rand(0.76, 1.62);
    particlePositions[i * 3] = Math.cos(angle) * radius;
    particlePositions[i * 3 + 1] = rand(0.11, 0.24);
    particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({ color: '#d8a5ff', size: 0.075, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  group.add(particles);
  const glow = new THREE.PointLight('#9f43ff', 5, 12, 2);
  glow.position.y = 1.1;
  group.add(glow);
  scene.add(group);
  return { group, accretion, particles };
}

const blackHole = createBlackHole();
const target = new THREE.Vector3(0, 0, 0);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const cameraToHole = new THREE.Vector3();
addEventListener('pointermove', (event) => {
  mouse.x = event.clientX / innerWidth * 2 - 1;
  mouse.y = -(event.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  if (raycaster.ray.intersectPlane(groundPlane, target)) {
    target.x = THREE.MathUtils.clamp(target.x, -targetLimit, targetLimit);
    target.z = THREE.MathUtils.clamp(target.z, -targetLimit, targetLimit);
  }
});

// Keep the smallest targets available while buildings remain larger than the starting hole.
let radius = 1.1;
const XP_PER_LEVEL = 100;
let evolutionXp = 0;
let score = 0;
let time = 90;
let ended = false;
let last = performance.now();
const $ = (id: string) => document.getElementById(id)!;
$('restart').addEventListener('click', () => location.reload());

function updateGrowthUi() {
  const currentXp = evolutionXp % XP_PER_LEVEL;
  $('level').textContent = String(1 + Math.floor(evolutionXp / XP_PER_LEVEL));
  $('volume').textContent = radius.toFixed(2);
  $('experience').textContent = `${currentXp}/${XP_PER_LEVEL}`;
  $('experience-fill').style.width = `${currentXp}%`;
  $('experience-bar').setAttribute('aria-valuenow', String(currentXp));
}

updateGrowthUi();

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
}

function setBuildingOpacity(item: Item, occlusion: number) {
  const opacity = THREE.MathUtils.lerp(1, 0.22, occlusion);
  item.group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      const transparent = opacity < 0.999;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.depthWrite = !transparent;
      material.opacity = opacity;
    });
  });
}

function updateBuildingOcclusion(dt: number) {
  cameraToHole.subVectors(blackHole.group.position, camera.position);
  const distanceToHole = cameraToHole.length();
  if (distanceToHole === 0) return;
  raycaster.set(camera.position, cameraToHole.normalize());
  for (const item of items) {
    if (item.kind !== 'building') continue;
    const canFade = !item.absorbing && item.size > radius;
    const blocked = canFade && raycaster.intersectObject(item.group, true).some((hit) => hit.distance < distanceToHole - 0.5);
    item.occlusion = THREE.MathUtils.damp(item.occlusion, blocked ? 1 : 0, 10, dt);
    setBuildingOpacity(item, item.occlusion);
  }
}

function finishItem(item: Item) {
  item.gone = true;
  const index = items.indexOf(item);
  if (index >= 0) items.splice(index, 1);
  scene.remove(item.group);
  disposeObject(item.group);
  item.dissolve?.depthMaterial.dispose();
  const growth = (item.kind === 'building' ? 19 : 8) * config.growthSpeed;
  score += item.kind === 'building' ? 25 : item.kind === 'car' ? 10 : 5;
  evolutionXp += growth;
  radius += growth / XP_PER_LEVEL;
  $('score').textContent = String(score);
  updateGrowthUi();
}

function animate(now: number) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.04);
  last = now;
  const accretionMaterial = blackHole.accretion.material as THREE.ShaderMaterial;
  accretionMaterial.uniforms.uTime.value += dt;
  blackHole.group.position.x = THREE.MathUtils.damp(blackHole.group.position.x, target.x, 2.1, dt);
  blackHole.group.position.z = THREE.MathUtils.damp(blackHole.group.position.z, target.z, 2.1, dt);
  // Start close to the hole, then pull back as its playable radius grows.
  const cameraProgress = THREE.MathUtils.clamp((radius - 1.1) / 8, 0, 1);
  const cameraScale = THREE.MathUtils.lerp(config.cameraZoom, config.cameraZoom * 3.42, cameraProgress);
  camera.position.x = THREE.MathUtils.damp(camera.position.x, blackHole.group.position.x + cameraOffset.x * cameraScale, 1.8, dt);
  camera.position.y = THREE.MathUtils.damp(camera.position.y, cameraOffset.y * cameraScale, 1.8, dt);
  camera.position.z = THREE.MathUtils.damp(camera.position.z, blackHole.group.position.z + cameraOffset.z * cameraScale, 1.8, dt);
  cameraFocus.x = THREE.MathUtils.damp(cameraFocus.x, blackHole.group.position.x, 2.4, dt);
  cameraFocus.z = THREE.MathUtils.damp(cameraFocus.z, blackHole.group.position.z, 2.4, dt);
  camera.lookAt(cameraFocus);
  updateBuildingOcclusion(dt);
  blackHole.group.scale.setScalar(1 + Math.min(radius * 0.3, 3));
  blackHole.accretion.rotation.z += dt * 0.9;
  blackHole.particles.rotation.y -= dt * 0.8;
  blackHole.particles.rotation.z += dt * 0.35;
  blackHole.group.children.forEach((child, index) => {
    if (child instanceof THREE.Mesh && child.geometry instanceof THREE.TorusGeometry) child.rotation.z += dt * (index === 2 ? -1.3 : 0.55);
  });

  if (!ended) {
    time = Math.max(0, time - dt);
    $('time').textContent = String(Math.ceil(time));
    if (time <= 0) {
      ended = true;
      $('final').textContent = String(score);
      $('end').classList.remove('hidden');
    }
    for (let index = items.length - 1; index >= 0; index--) {
      const item = items[index];
      const position = item.group.position;
      const dx = position.x - blackHole.group.position.x;
      const dz = position.z - blackHole.group.position.z;
      const distance = Math.hypot(dx, dz);
      const allowed = radius * 0.9 + item.size * 0.18;
      if (!item.absorbing && distance < allowed && item.size <= radius) item.absorbing = true;
      if (!item.absorbing) continue;
      const pull = 1 - Math.min(distance / (allowed + 0.001), 1);
      item.progress = Math.min(1.2, item.progress + dt * (0.62 + pull * 2.4));
      const eased = THREE.MathUtils.smoothstep(item.progress, 0, 1);
      position.x = THREE.MathUtils.damp(position.x, blackHole.group.position.x, 4.5 + pull * 9, dt);
      position.z = THREE.MathUtils.damp(position.z, blackHole.group.position.z, 4.5 + pull * 9, dt);
      position.y = THREE.MathUtils.lerp(0, -0.78, eased);
      item.group.scale.setScalar(THREE.MathUtils.lerp(1, 0.06, eased));
      item.group.rotation.y += dt * (1.2 + pull * 5);
      if (item.dissolve) {
        item.dissolve.dissolve.value = eased * 1.18;
        item.dissolve.time.value = now / 1000;
      }
      if (item.progress >= 1) finishItem(item);
    }
  }
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

