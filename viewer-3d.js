/* PLATIA — modelos gastronómicos tridimensionales procedurales.
   Reinterpretan las referencias ilustradas, no reconstruyen exactamente sus fotos. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const surface = document.querySelector('#platia-3d');
const stage = document.querySelector('#model-stage');
const placeholder = document.querySelector('#model-placeholder');
const status = document.querySelector('#model-status');
const spinButton = document.querySelector('#model-spin');
const resetButton = document.querySelector('#model-reset');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const material = (color, roughness = .77, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const sesameMaterial = material('#f5e4b2', .86);

// Una semilla estable hace que los detalles permanezcan donde están al girar el plato.
function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function mesh(parent, geometry, paint, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, paint);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function ellipsoid(parent, radius, scale, paint, x, y, z) {
  const item = mesh(parent, new THREE.SphereGeometry(radius, 36, 20), paint, x, y, z);
  item.scale.set(...scale);
  return item;
}

function disc(parent, radiusTop, radiusBottom, depth, y, paint) {
  return mesh(parent, new THREE.CylinderGeometry(radiusTop, radiusBottom, depth, 64, 1), paint, 0, y, 0);
}

function roundPlate(parent, radius = 2.65) {
  const porcelain = material('#f3eee5', .26);
  disc(parent, radius, radius - .11, .13, -.40, porcelain);
  disc(parent, radius - .23, radius - .25, .05, -.325, material('#f8f4e9', .23));
  const rim = mesh(parent, new THREE.TorusGeometry(radius - .2, .085, 12, 100), porcelain, 0, -.31, 0);
  rim.rotation.x = Math.PI / 2;
  const thinRim = mesh(parent, new THREE.TorusGeometry(radius - .44, .017, 6, 100), material('#e4d9c7', .4), 0, -.293, 0);
  thinRim.rotation.x = Math.PI / 2;
}

function wavyLettuce(parent, y, seed) {
  const random = seeded(seed);
  const leaves = 13;
  const paint = new THREE.MeshStandardMaterial({ color: '#53953d', roughness: .92, side: THREE.DoubleSide });
  for (let i = 0; i < leaves; i++) {
    const theta = (i / leaves) * Math.PI * 2;
    const next = ((i + 1) / leaves) * Math.PI * 2;
    const ripple = Math.sin(i * 4.1) * .11 + random() * .12;
    const triangles = [
      0, y, 0,
      Math.cos(theta) * 2.03, y + ripple, Math.sin(theta) * 2.03,
      Math.cos(next) * 2.0, y - ripple, Math.sin(next) * 2.0,
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(triangles, 3));
    geometry.computeVertexNormals();
    mesh(parent, geometry, paint);
  }
}

function createBurger() {
  const group = new THREE.Group();
  roundPlate(group);
  const bread = material('#c78845', .88);
  const breadEdge = material('#e7ae68', .91);
  const grilled = material('#66351f', 1);
  const tomato = material('#b92f23', .52);
  const cheddar = new THREE.MeshStandardMaterial({ color: '#f5a627', roughness: .73, side: THREE.DoubleSide });

  ellipsoid(group, 1, [1.9, .28, 1.86], bread, 0, -.04, 0);
  disc(group, 1.91, 1.82, .19, .12, breadEdge);
  ellipsoid(group, 1, [1.92, .34, 1.82], grilled, 0, .49, 0);
  ellipsoid(group, 1, [1.9, .24, 1.79], material('#7b4226', .98), 0, .48, 0);

  const random = seeded(101);
  // Superficie de carne irregular, con pequeñas zonas tostadas.
  for (let i = 0; i < 75; i++) {
    const angle = random() * Math.PI * 2;
    const r = 1.72 + random() * .19;
    ellipsoid(group, .055 + random() * .045, [1, .45, 1.7],
      material(random() > .5 ? '#4e2a1a' : '#8c4b2d', .94),
      Math.cos(angle) * r, .43 + (random() - .5) * .33, Math.sin(angle) * r);
  }

  // Rebanada de queso con esquinas que sobresalen de la hamburguesa.
  const shape = new THREE.Shape();
  shape.moveTo(-1.62, -1.62);
  shape.lineTo(1.62, -1.55);
  shape.lineTo(1.77, 1.5);
  shape.lineTo(-1.6, 1.68);
  shape.closePath();
  const cheese = mesh(group, new THREE.ShapeGeometry(shape), cheddar, 0, .77, 0);
  cheese.rotation.x = -Math.PI / 2;
  cheese.rotation.z = .19;
  // Bordes derretidos visibles desde un lado.
  for (const angle of [0.4, 2.2, 3.9, 5.5]) {
    const drop = ellipsoid(group, .15, [.5, 1.2, .28], cheddar,
      Math.cos(angle) * 1.56, .62, Math.sin(angle) * 1.56);
    drop.rotation.y = angle;
  }

  for (const angle of [.35, 1.75, 3.28, 4.7]) {
    const slice = mesh(group, new THREE.CylinderGeometry(.73, .73, .095, 32), tomato,
      Math.cos(angle) * .76, .89, Math.sin(angle) * .72);
    slice.rotation.z = (random() - .5) * .12;
  }
  const onion = material('#d8b0c6', .62);
  for (const [x, z] of [[-.65,.35],[.55,-.3]]) {
    const ring = mesh(group, new THREE.TorusGeometry(.71, .066, 8, 42), onion, x, .985, z);
    ring.rotation.x = Math.PI / 2;
  }
  wavyLettuce(group, 1.09, 42);
  disc(group, 1.96, 1.98, .19, 1.27, breadEdge);

  const bun = mesh(group, new THREE.SphereGeometry(1, 60, 30, 0, Math.PI * 2, 0, Math.PI / 2), bread, 0, 1.36, 0);
  bun.scale.set(2.04, .95, 1.93);
  // Semillas sobre la superficie real de la cúpula.
  const seedGeometry = new THREE.SphereGeometry(1, 10, 8);
  for (let i = 0; i < 63; i++) {
    const theta = random() * 2 * Math.PI;
    const radius = Math.sqrt(random()) * 1.65;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    const y = 1.36 + .95 * Math.sqrt(Math.max(0, 1 - x*x/(2.04*2.04) - z*z/(1.93*1.93)));
    const seed = mesh(group, seedGeometry, sesameMaterial, x, y + .025, z);
    const normal = new THREE.Vector3(x / (2.04*2.04), (y-1.36)/(.95*.95), z/(1.93*1.93)).normalize();
    seed.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), normal);
    seed.rotateY(random() * Math.PI);
    seed.scale.set(.068, .019, .14);
  }
  return group;
}

function basilLeaf(parent, x, y, z, angle, factor = 1) {
  const leaf = ellipsoid(parent, 1, [.18 * factor, .035 * factor, .49 * factor], material('#286a36', .7), x, y, z);
  leaf.rotation.y = angle;
  leaf.rotation.x = -.08;
  const stem = ellipsoid(parent, 1, [.025,.017,.31 * factor], material('#8ea63c', .91), x, y + .036, z);
  stem.rotation.y = angle;
}

function createPizza() {
  const group = new THREE.Group();
  roundPlate(group, 2.85);
  const dough = material('#c78a4d', .96);
  disc(group, 2.36, 2.32, .23, -.035, dough);
  disc(group, 2.16, 2.17, .035, .1, material('#bb3928', .79));
  disc(group, 2.04, 2.09, .049, .14, material('#eecb8c', .65));
  const crust = mesh(group, new THREE.TorusGeometry(2.17, .23, 20, 100), material('#dfa25d', .89), 0, .10, 0);
  crust.rotation.x = Math.PI / 2;
  const random = seeded(2026);
  const mozzarella = material('#fff0c9', .63);
  const tomatoRed = material('#b83324', .64);

  // Pequeños círculos de mozzarella y tomates distribuidos sobre el disco.
  for (let i = 0; i < 30; i++) {
    const angle = random() * 2 * Math.PI;
    const r = Math.sqrt(random()) * 1.83;
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
    const blob = ellipsoid(group, 1,
      [.27 + random() * .16, .042 + random() * .024, .27 + random() * .18],
      i % 3 === 0 ? tomatoRed : mozzarella, x, .205, z);
    blob.rotation.y = random() * Math.PI;
  }
  // Variaciones de tostado sobre el borde de la masa.
  const blisterA = material('#aa6838', .99);
  const blisterB = material('#efb975', .89);
  for (let i = 0; i < 95; i++) {
    const angle = random() * 2 * Math.PI;
    const r = 2.1 + random() * .25;
    ellipsoid(group, 1, [.042 + random() * .09, .015, .035 + random() * .07],
      random() > .6 ? blisterA : blisterB,
      Math.cos(angle) * r, .30 + random() * .01, Math.sin(angle) * r);
  }

  for (const [x,z,angle] of [[-.6,.8,.7],[.95,.4,2.2],[-.55,-.9,1.1],[1.1,-.72,2.8],[.05,-.1,-.5],[-1.32,.02,.6]]) {
    basilLeaf(group, x, .27, z, angle, .86 + random() * .36);
    basilLeaf(group, x + .16, .28, z + .08, angle + 1, .58);
  }
  return group;
}

function disposeGroup(group) {
  const materials = new Set();
  const geometries = new Set();
  group.traverse((item) => {
    if (item.geometry) geometries.add(item.geometry);
    if (item.material) (Array.isArray(item.material) ? item.material : [item.material]).forEach((m) => materials.add(m));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((paint) => paint.dispose());
}

try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.63;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  surface.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff9ef', '#5c4b3c', 3.2));
  const mainLight = new THREE.DirectionalLight('#fff5e8', 4.1);
  mainLight.position.set(-4, 9, 6);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(1024, 1024);
  mainLight.shadow.camera.left = -7;
  mainLight.shadow.camera.right = 7;
  mainLight.shadow.camera.top = 7;
  mainLight.shadow.camera.bottom = -7;
  scene.add(mainLight);
  const fill = new THREE.DirectionalLight('#dfdbd2', 1.9);
  fill.position.set(5, 4, -5);
  scene.add(fill);

  const camera = new THREE.PerspectiveCamera(40, 1, .1, 70);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .08;
  controls.enablePan = false;
  controls.rotateSpeed = .7;
  controls.minDistance = 4.5;
  controls.maxDistance = 14;
  controls.minPolarAngle = .08;
  controls.maxPolarAngle = Math.PI * .88;
  controls.autoRotateSpeed = .85;

  let autoSpin = !reduceMotion.matches;
  let currentFood = null;
  let isVisible = true;
  let frame = 0;

  function reflectSpinButton() {
    spinButton.innerHTML = autoSpin
      ? '<span aria-hidden="true">Ⅱ</span> Pausar giro'
      : '<span aria-hidden="true">↻</span> Activar giro';
    spinButton.setAttribute('aria-pressed', String(autoSpin));
    controls.autoRotate = autoSpin;
  }

  function setSpinning(enabled) {
    autoSpin = enabled;
    reflectSpinButton();
  }

  function resetCamera(model) {
    if (model === 'pizza') {
      camera.position.set(5.1, 7.5, 5.9);
      controls.target.set(0, .03, 0);
    } else {
      camera.position.set(5.9, 4.35, 7.2);
      controls.target.set(0, .76, 0);
    }
    controls.update();
    controls.saveState();
  }

  function showModel(model) {
    if (currentFood) {
      scene.remove(currentFood);
      disposeGroup(currentFood);
    }
    currentFood = model === 'pizza' ? createPizza() : createBurger();
    scene.add(currentFood);
    resetCamera(model);
    renderer.render(scene, camera);
  }

  function resize() {
    const width = Math.max(surface.clientWidth, 1);
    const height = Math.max(surface.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  function animate() {
    frame = 0;
    if (!isVisible || document.hidden) return;
    controls.update();
    renderer.render(scene, camera);
    frame = window.requestAnimationFrame(animate);
  }

  function updateLoop() {
    if (isVisible && !document.hidden && !frame) frame = window.requestAnimationFrame(animate);
    if ((!isVisible || document.hidden) && frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  window.addEventListener('platia:model-change', (event) => {
    if (event.detail?.model === 'burger' || event.detail?.model === 'pizza') {
      showModel(event.detail.model);
    }
  });
  spinButton.addEventListener('click', () => setSpinning(!autoSpin));
  resetButton.addEventListener('click', () => {
    controls.reset();
    renderer.render(scene, camera);
  });
  controls.addEventListener('start', () => setSpinning(false));
  surface.addEventListener('keydown', (event) => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    setSpinning(false);
    const vector = new THREE.Vector3().subVectors(camera.position, controls.target);
    const spherical = new THREE.Spherical().setFromVector3(vector);
    spherical.theta += event.key === 'ArrowLeft' ? -.13 : event.key === 'ArrowRight' ? .13 : 0;
    spherical.phi += event.key === 'ArrowUp' ? -.13 : event.key === 'ArrowDown' ? .13 : 0;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    controls.update();
  });

  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      updateLoop();
    }, { threshold: .03 });
    visibility.observe(stage);
  }
  document.addEventListener('visibilitychange', updateLoop);
  reduceMotion.addEventListener('change', (event) => setSpinning(!event.matches));

  showModel(document.querySelector('.model-choice.active')?.dataset.model === 'pizza' ? 'pizza' : 'burger');
  resize();
  reflectSpinButton();
  spinButton.disabled = false;
  resetButton.disabled = false;
  placeholder.hidden = true;
  window.__platia3DReady = true;
  updateLoop();

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    placeholder.hidden = false;
    status.textContent = 'El visor 3D se interrumpió. Actualiza la página para volver a probarlo.';
    spinButton.disabled = true;
    resetButton.disabled = true;
    document.querySelector('.stage-chip').lastChild.textContent = ' VISTA DE REFERENCIA';
    isVisible = false;
    updateLoop();
  });
} catch (error) {
  console.warn('PLATIA: no se pudo iniciar WebGL', error);
  placeholder.hidden = false;
  status.textContent = 'Este dispositivo no permite mostrar el visor 3D. Puedes ver las imágenes de referencia.';
  document.querySelector('.stage-chip').lastChild.textContent = ' VISTA DE REFERENCIA';
  spinButton.disabled = true;
  resetButton.disabled = true;
}
