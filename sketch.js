import * as THREE from "three";
import SpriteText from "three-spritetext";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let scene, clock, controls, camera;
let directionalLight;
let webglrenderer;
let forgottens = [];
let triedToRemembers = [];
let isDone = false;
let clothMaterial;
let influence;
let startTime = null;
let physicsWorld;
let gravityConstant = -5; // -9.8
const margin = 0.05;
let transformAux;
let rigidBodies = [];
let cloth;
const sc = 3;
const clothWidth = 10 * sc; // orig 10
const clothHeight = 12 * sc; // orig 12
const clothSegmentsFactor = 3;
const clothPos = new THREE.Vector3(-3, 4, 2); // bottom right corner? ... orig y: 0
const pylonHeight = clothPos.y + clothHeight * 1.2; // orig * 1.0
const pylonWidth = 0.4;
const frameTopLength = 1 + clothWidth;

let cameraScale; // 70
let cameraVOffset = clothHeight - clothPos.y * sc - 4;
let cameraHOffset = clothPos.x - 10;
let cameraNear = -100;
let cameraFar = 100;

let capsule, capsuleBody, windVelocity;

let textHeight = 2;
let fontSize = 90; // default
let textObjects = [];

const cameraStartingPos = new THREE.Vector3(-6.7, 9.3, 10);

/* -------------------------------------------------------------------------- */
/*                              fetch forgottens                              */
/* -------------------------------------------------------------------------- */

fetch("./forgottens.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("network response was not ok");
    }
    return response.json();
  })
  .then((data) => {
    forgottens = data;
  })
  .catch((error) => {
    console.error("fetch operation issue:", error);
  });

/* -------------------------------------------------------------------------- */
/*                                    ammo                                    */
/* -------------------------------------------------------------------------- */

Ammo().then(function (AmmoLib) {
  Ammo = AmmoLib;

  init();
  update();
});

function init() {
  initScene();
  initPhysics();
  initObjects();
  initEventListeners();
}

/* -------------------------------------------------------------------------- */
/*                                    scene                                   */
/* -------------------------------------------------------------------------- */

function initScene() {
  scene = new THREE.Scene();
  clock = new THREE.Clock();

  addLighting();

  if (window.innerWidth <= 700) {
    cameraScale = 14;
  } else {
    cameraScale = 28;
  }

  camera = new THREE.OrthographicCamera(
    -window.innerWidth / cameraScale + cameraHOffset,
    window.innerWidth / cameraScale + cameraHOffset,
    window.innerHeight / cameraScale + cameraVOffset,
    -window.innerHeight / cameraScale + cameraVOffset,
    cameraNear,
    cameraFar
  );

  scene.add(camera);
  camera.position.copy(cameraStartingPos);
  camera.lookAt(scene);

  initRenderers();

  controls = new OrbitControls(camera, webglrenderer.domElement);
  // controls.enabled = false;

  window.addEventListener("resize", () => {
    onWindowResize();
    updateEventListeners();
  });
}

/* -------------------------------------------------------------------------- */
/*                                  renderers                                 */
/* -------------------------------------------------------------------------- */

function initRenderers() {
  webglrenderer = new THREE.WebGLRenderer();
  webglrenderer.setPixelRatio(window.devicePixelRatio);
  webglrenderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(webglrenderer.domElement);
  webglrenderer.domElement.id = "stage";
  webglrenderer.setClearColor(0xeeeef6, 1);
}

/* -------------------------------------------------------------------------- */
/*                                   physics                                  */
/* -------------------------------------------------------------------------- */

function initPhysics() {
  const collisionConfiguration =
    new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
  const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  const broadphase = new Ammo.btDbvtBroadphase();
  const solver = new Ammo.btSequentialImpulseConstraintSolver();
  const softBodySolver = new Ammo.btDefaultSoftBodySolver();
  physicsWorld = new Ammo.btSoftRigidDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfiguration,
    softBodySolver
  );
  physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
  physicsWorld
    .getWorldInfo()
    .set_m_gravity(new Ammo.btVector3(0, gravityConstant, 0));
  transformAux = new Ammo.btTransform();
}

/* -------------------------------------------------------------------------- */
/*                                scene objects                               */
/* -------------------------------------------------------------------------- */

function initObjects() {
  const pos = new THREE.Vector3();
  const quat = new THREE.Euler();

  /* -------------------------- cloth graphic object -------------------------- */

  const clothNumSegmentsZ = clothWidth * clothSegmentsFactor; // more segments = more wrinkling
  const clothNumSegmentsY = clothHeight * clothSegmentsFactor;

  const clothGeometry = new THREE.PlaneGeometry(
    clothWidth,
    clothHeight,
    clothNumSegmentsZ,
    clothNumSegmentsY
  );
  clothGeometry.rotateY(Math.PI * 0.5);
  clothGeometry.translate(
    clothPos.x,
    clothPos.y + clothHeight * 0.5,
    clothPos.z - clothWidth * 0.5
  );

  clothMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });
  cloth = new THREE.Mesh(clothGeometry, clothMaterial);
  scene.add(cloth);

  /* --------------------------- cloth physics object -------------------------- */

  const softBodyHelpers = new Ammo.btSoftBodyHelpers();
  const clothCorner00 = new Ammo.btVector3(
    clothPos.x,
    clothPos.y + clothHeight,
    clothPos.z - 0.5
  );

  const clothCorner01 = new Ammo.btVector3(
    clothPos.x,
    clothPos.y + clothHeight,
    clothPos.z - clothWidth - 0.5
  );
  const clothCorner10 = new Ammo.btVector3(
    clothPos.x,
    clothPos.y,
    clothPos.z - 0.5
  );
  const clothCorner11 = new Ammo.btVector3(
    clothPos.x,
    clothPos.y,
    clothPos.z - clothWidth - 0.5
  );
  const clothSoftBody = softBodyHelpers.CreatePatch(
    physicsWorld.getWorldInfo(),
    clothCorner00,
    clothCorner01,
    clothCorner10,
    clothCorner11,
    clothNumSegmentsZ + 1,
    clothNumSegmentsY + 1,
    0,
    true
  );
  const sbConfig = clothSoftBody.get_m_cfg();
  sbConfig.set_viterations(10);
  sbConfig.set_piterations(10);

  clothSoftBody.setTotalMass(0.9, false);
  Ammo.castObject(clothSoftBody, Ammo.btCollisionObject)
    .getCollisionShape()
    .setMargin(margin * 3);
  physicsWorld.addSoftBody(clothSoftBody, 1, -1);
  cloth.userData.physicsBody = clothSoftBody;
  // Disable deactivation
  clothSoftBody.setActivationState(4);

  /* ---------------------------------- frame --------------------------------- */

  const frameMass = 1;
  const baseMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("rgb(0, 0, 0)"),
    transparent: true,
    opacity: 0.001,
    visible: false,
  });

  pos.set(clothPos.x, 0.5 * pylonHeight, clothPos.z - frameTopLength);
  const frameLeft = createParallelepiped(
    pylonWidth,
    pylonHeight,
    pylonWidth,
    0,
    pos,
    quat,
    baseMaterial
  );

  pos.set(clothPos.x, 0.5 * pylonHeight, clothPos.z);
  const frameRight = createParallelepiped(
    pylonWidth,
    pylonHeight,
    pylonWidth,
    0,
    pos,
    quat,
    baseMaterial
  );

  pos.set(clothPos.x, pylonHeight, clothPos.z - 0.5 * frameTopLength);
  const frameTop = createParallelepiped(
    pylonWidth,
    pylonWidth,
    frameTopLength + pylonWidth,
    frameMass,
    pos,
    quat,
    baseMaterial
  );

  pos.set(clothPos.x, 0, clothPos.z - 0.5 * frameTopLength);
  const frameBottom = createParallelepiped(
    pylonWidth,
    pylonWidth,
    frameTopLength + pylonWidth,
    frameMass,
    pos,
    quat,
    baseMaterial
  );

  /* ------------------------------- constraints ------------------------------ */

  const FoR_top_left = new Ammo.btTransform();
  FoR_top_left.setIdentity();
  FoR_top_left.setOrigin(new Ammo.btVector3(0, 0, -frameTopLength / 2));

  const FoR_top_right = new Ammo.btTransform();
  FoR_top_right.setIdentity();
  FoR_top_right.setOrigin(new Ammo.btVector3(0, 0, frameTopLength / 2));

  const FoR_bottom_left = new Ammo.btTransform();
  FoR_bottom_left.setIdentity();
  FoR_bottom_left.setOrigin(new Ammo.btVector3(0, 0, -frameTopLength / 2));

  const FoR_bottom_right = new Ammo.btTransform();
  FoR_bottom_right.setIdentity();
  FoR_bottom_right.setOrigin(new Ammo.btVector3(0, 0, frameTopLength / 2));

  const FoR_left_top = new Ammo.btTransform();
  FoR_left_top.setIdentity();
  FoR_left_top.setOrigin(new Ammo.btVector3(0, pylonHeight / 2, 0));

  const FoR_left_bottom = new Ammo.btTransform();
  FoR_left_bottom.setIdentity();
  FoR_left_bottom.setOrigin(new Ammo.btVector3(0, -pylonHeight / 2, 0));

  const FoR_right_top = new Ammo.btTransform();
  FoR_right_top.setIdentity();
  FoR_right_top.setOrigin(new Ammo.btVector3(0, pylonHeight / 2, 0));

  const FoR_right_bottom = new Ammo.btTransform();
  FoR_right_bottom.setIdentity();
  FoR_right_bottom.setOrigin(new Ammo.btVector3(0, -pylonHeight / 2, 0));

  // top left
  const c1 = new Ammo.btGeneric6DofConstraint(
    frameTop.userData.physicsBody,
    frameLeft.userData.physicsBody,
    FoR_top_left,
    FoR_left_top,
    /* disableCollisionsBetweenLinkedBodies */ false
  );
  physicsWorld.addConstraint(
    c1,
    /* disableCollisionsBetweenLinkedBodies */ false
  );

  // top right
  const c2 = new Ammo.btGeneric6DofConstraint(
    frameTop.userData.physicsBody,
    frameRight.userData.physicsBody,
    FoR_top_right,
    FoR_right_top,
    false
  );
  physicsWorld.addConstraint(c2, false);

  // bottom left
  const c3 = new Ammo.btGeneric6DofConstraint(
    frameBottom.userData.physicsBody,
    frameLeft.userData.physicsBody,
    FoR_bottom_left,
    FoR_left_bottom,
    false
  );
  physicsWorld.addConstraint(c3, false);

  // bottom right
  const c4 = new Ammo.btGeneric6DofConstraint(
    frameBottom.userData.physicsBody,
    frameRight.userData.physicsBody,
    FoR_bottom_right,
    FoR_right_bottom,
    false
  );
  physicsWorld.addConstraint(c4, false);

  influence = 1;
  // Higher values make the connection more rigid, while lower values allow for more flexibility and deformation.
  clothSoftBody.appendAnchor(
    0,
    frameTop.userData.physicsBody,
    false,
    influence
  );
  clothSoftBody.appendAnchor(
    clothNumSegmentsZ,
    frameTop.userData.physicsBody,
    false,
    influence
  );

  /* ---------------------------------- wind ---------------------------------- */
  windVelocity = new Ammo.btVector3(5, 0, 0); // move away from viewer
}

/* -------------------------------------------------------------------------- */
/*                               render + resize                              */
/* -------------------------------------------------------------------------- */

function render() {
  const deltaTime = clock.getDelta();
  updatePhysics(deltaTime);
  webglrenderer.render(scene, camera);
}

function onWindowResize() {
  camera.left = -window.innerWidth / cameraScale + cameraHOffset;
  camera.right = window.innerWidth / cameraScale + cameraHOffset;
  camera.top = window.innerHeight / cameraScale + cameraVOffset;
  camera.bottom = -window.innerHeight / cameraScale + cameraVOffset;
  camera.updateProjectionMatrix();
  webglrenderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

/* -------------------------------------------------------------------------- */
/*                                   updates                                  */
/* -------------------------------------------------------------------------- */

function update(renderer, scene, camera, clock) {
  window.requestAnimationFrame(update);
  render();
}

function updatePhysics(deltaTime) {
  // Step world
  if (physicsWorld) {
    physicsWorld.stepSimulation(deltaTime, 10);

    // Update cloth
    const softBody = cloth.userData.physicsBody;
    const clothPositions = cloth.geometry.attributes.position.array;
    const numVerts = clothPositions.length / 3;
    const nodes = softBody.get_m_nodes();
    let indexFloat = 0;

    for (let i = 0; i < numVerts; i++) {
      const node = nodes.at(i);
      const nodePos = node.get_m_x();
      clothPositions[indexFloat++] = nodePos.x();
      clothPositions[indexFloat++] = nodePos.y();
      clothPositions[indexFloat++] = nodePos.z();
    }

    cloth.geometry.computeVertexNormals();
    cloth.geometry.attributes.position.needsUpdate = true;
    cloth.geometry.attributes.normal.needsUpdate = true;

    // Update rigid bodies
    for (let i = 0, il = rigidBodies.length; i < il; i++) {
      const objThree = rigidBodies[i];
      const objPhys = objThree.userData.physicsBody;
      const ms = objPhys.getMotionState();
      if (ms) {
        ms.getWorldTransform(transformAux);
        const p = transformAux.getOrigin();
        const q = transformAux.getRotation();
        objThree.position.set(p.x(), p.y(), p.z());
        objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
      }
    }
  }

  setInterval(removeBodies, 1000);
  updateTextPositions();
}

function updateTextPositions() {
  for (let i = 0; i < textObjects.length; i++) {
    const capsule = rigidBodies[i];
    const textObject = textObjects[i];
    textObject.position.copy(capsule.position);
  }
}

function updateCameraScale() {
  camera.left = -window.innerWidth / cameraScale + cameraHOffset;
  camera.right = window.innerWidth / cameraScale + cameraHOffset;
  camera.top = window.innerHeight / cameraScale + cameraVOffset;
  camera.bottom = -window.innerHeight / cameraScale + cameraVOffset;
  camera.updateProjectionMatrix();
  // console.log("camera scale: ", cameraScale);
}

/* -------------------------------------------------------------------------- */
/*                                  lighting                                  */
/* -------------------------------------------------------------------------- */

function addLighting() {
  directionalLight = getDirectionalLight(1);
  directionalLight.position.set(-100, 100, 50);
  scene.add(directionalLight);

  const offset = 3;
  const rectX = -6;
  const width = 100;
  const length = 60;
  const intensity = 1.5;

  const rectLight = new THREE.RectAreaLight(0x4e00ff, intensity, width, length);
  rectLight.position.set(rectX, pylonHeight * 2, offset);
  rectLight.rotation.set(0, -Math.PI / 2, 0);
  rectLight.lookAt(clothPos.x, clothPos.y, clothPos.z - frameTopLength / 2);
  scene.add(rectLight);

  const rectLight_1 = new THREE.RectAreaLight(
    0xc5edac,
    intensity,
    width,
    length
  );
  rectLight_1.position.set(rectX, pylonHeight * 2, -length / 2 - offset);
  rectLight_1.rotation.set(0, -Math.PI / 2, 0);
  rectLight_1.lookAt(clothPos.x, clothPos.y, clothPos.z - frameTopLength / 2);
  scene.add(rectLight_1);
}

function getDirectionalLight(intensity) {
  var light = new THREE.DirectionalLight(0xffffff, intensity);
  light.castShadow = true;
  light.shadow.mapSize.width = 1024;
  light.shadow.camera.near = 1;
  light.shadow.camera.far = 500;
  return light;
}

/* -------------------------------------------------------------------------- */
/*                              object functions                              */
/* -------------------------------------------------------------------------- */

function createParallelepiped(sx, sy, sz, mass, pos, eu, material) {
  const threeObject = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1),
    material
  );
  const shape = new Ammo.btBoxShape(
    new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5)
  );
  shape.setMargin(margin);

  createRigidBody(threeObject, shape, mass, pos, eu);

  return threeObject;
}

function createCapsule(length, pos) {
  const radius = 1;
  const threeObject = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 32, 32),
    new THREE.MeshBasicMaterial({
      visible: false,
    })
  );

  threeObject.rotateZ(-Math.PI / 2);
  const directionToCamera = new THREE.Vector3().subVectors(
    cameraStartingPos,
    threeObject.position
  ); // calculate direction by taking the difference of 2 vectors

  const angle = Math.atan2(directionToCamera.x, directionToCamera.z);
  threeObject.rotateY(angle);

  const eu = new THREE.Euler().setFromQuaternion(threeObject.quaternion);

  const shape = new Ammo.btCapsuleShape(radius, length);
  shape.setMargin(margin);

  createRigidBody(threeObject, shape, 2, pos, eu);

  return threeObject;
}

function createSpriteText(text) {
  const sT = new SpriteText(text);
  sT.color = "black";
  sT.fontFace = "Times";
  sT.textHeight = textHeight;
  sT.fontSize = fontSize;
  sT.strokeWidth = 0;
  sT.backgroundColor = false;
  sT.padding = 1;

  return sT;
}

function createRigidBody(threeObject, physicsShape, mass, pos, eu) {
  threeObject.position.copy(pos);
  const euler = new THREE.Quaternion().setFromEuler(eu);

  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(
    new Ammo.btQuaternion(euler.x, euler.y, euler.z, euler.w)
  );

  const motionState = new Ammo.btDefaultMotionState(transform);

  const localInertia = new Ammo.btVector3(0, 0, 0); // an object's resistance to changes in its rotational motion around its center of mass
  physicsShape.calculateLocalInertia(mass, localInertia);

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(
    mass,
    motionState,
    physicsShape,
    localInertia
  );
  const body = new Ammo.btRigidBody(rbInfo);

  threeObject.userData.physicsBody = body;

  scene.add(threeObject);

  if (mass > 1) {
    rigidBodies.push(threeObject);

    // Disable deactivation
    body.setActivationState(4);
  }

  physicsWorld.addRigidBody(body);
}

function removeBodies() {
  const killY = -15;
  for (let i = rigidBodies.length - 1; i >= 0; i--) {
    const capsule = rigidBodies[i];
    const textObj = textObjects[i];
    const pos = capsule.position;

    if (pos.y < killY) {
      scene.remove(capsule);
      physicsWorld.removeRigidBody(capsule.userData.physicsBody);
      scene.remove(textObj);

      rigidBodies.splice(i, 1);
      textObjects.splice(i, 1);
      i--;
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                 interaction                                */
/* -------------------------------------------------------------------------- */

function initEventListeners() {
  if ("ontouchstart" in window) {
    window.addEventListener("touchstart", createWind);
  } else {
    window.addEventListener("click", createWind);
  }
}

function removeEventListeners() {
  window.removeEventListener("touchstart", createWind);
  window.removeEventListener("click", createWind);
}

function updateEventListeners() {
  if (window.innerWidth <= 700) {
    removeEventListeners();

    cameraScale = 14;
    updateCameraScale();
    window.addEventListener("touchstart", createWind);
    // console.log("tracking touch events");
  } else {
    removeEventListeners();

    cameraScale = 28;
    updateCameraScale();
    window.addEventListener("click", createWind);
    // console.log("tracking click events");
  }
}

function getWeightedRandIndex() {
  const weights = {
    factual: 3,
    logistical: 3,
    sentimental: 1,
    ancestral: 1,
  };

  let weightedIndices = [];

  forgottens.forEach((item, index) => {
    if (!triedToRemembers.includes(index)) {
      const weight = weights[item.type];
      for (let i = 0; i < weight; i++) {
        weightedIndices.push(index);
      }
    }
  });

  const randIndex = Math.floor(Math.random() * weightedIndices.length);
  return weightedIndices[randIndex];
}

function getApproxTextWidth(text) {
  const approxCharWidth = textHeight * 0.35; // hand-refined
  const textWidth = text.length * approxCharWidth;
  return textWidth;
}

async function createWind() {
  if (triedToRemembers.length === forgottens.length) {
    isDone = true;
    return true;
  }

  const startingPos = new THREE.Vector3(
    THREE.MathUtils.randFloat(clothPos.x / 2 - 9, clothPos.x / 2 - 5), // x
    THREE.MathUtils.randFloat(
      clothPos.y + clothHeight / 2,
      clothPos.y + clothHeight
    ), // y
    THREE.MathUtils.randFloat(
      clothPos.z - clothWidth - pylonWidth + 3,
      clothPos.z - pylonWidth - 3
    ) // z
  );

  const index = getWeightedRandIndex();
  triedToRemembers.push(index);

  let sprite = createSpriteText(forgottens[index].forgotten);
  sprite.position.copy(startingPos);
  scene.add(sprite);
  capsule = createCapsule(
    getApproxTextWidth(forgottens[index].forgotten),
    startingPos
  );
  textObjects.push(sprite);

  capsuleBody = capsule.userData.physicsBody;
  capsuleBody.setLinearVelocity(windVelocity);
}

function fadeOutCloth(time) {
  if (!startTime) {
    startTime = time;
  }

  const duration = 8000;
  let elapsedTime = time - startTime;
  let fraction = elapsedTime / duration;
  let easeOutFraction = 1 - Math.pow(1 - fraction, 2);

  clothMaterial.opacity = 1 - easeOutFraction;

  if (elapsedTime < duration) {
    requestAnimationFrame(fadeOutCloth);
  } else {
    clothMaterial.opacity = 0;
  }
}

async function endScene() {
  if (!isDone) {
    setTimeout(endScene, 1000);
  } else {
    clothMaterial.transparent = true;
    requestAnimationFrame(fadeOutCloth);
    console.log("you've forgotten everything");
  }
}

endScene();
