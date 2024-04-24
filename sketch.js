// https://github.com/mrdoob/three.js/blob/master/examples/physics_ammo_cloth.html#L423
// https://medium.com/@bluemagnificent/intro-to-javascript-3d-physics-using-ammo-js-and-three-js-dd48df81f591
// https://stackoverflow.com/questions/45947570/how-to-attach-an-event-listener-to-the-dom-depending-upon-the-screen-size

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
// import { gsap } from "gsap";
import { RectAreaLightHelper } from "three/addons/helpers/RectAreaLightHelper.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { AfterimagePass } from "three/addons/postprocessing/AfterimagePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  CSS3DRenderer,
  CSS3DObject,
} from "three/addons/renderers/CSS3DRenderer.js";
import forgottens from "./forgottens.json" assert { type: "json" };

let scene, clock, camera;
let directionalLight, ambientLight;
let axesHelper, gridHelper, dLightHelper, dLightShadowHelper;
let webglrenderer, css3drenderer, composer, afterimagePass;

let isDone = false;
let triedToRemembers = [];
let triedSentimentals = [];
let triedAncestrals = [];
let triedFactuals = [];
let triedLogisticals = [];
let influence;

let physicsWorld;
let gravityConstant = -5; // -9.8
const margin = 0.05;
let transformAux;
const rigidBodies = [];

let cloth;
const clothWidth = 8;
const clothHeight = 10;
const clothPos = new THREE.Vector3(-3, 4, 2); // bottom right corner? ... orig y: 0
const pylonHeight = clothPos.y + clothHeight * 1.2; // orig * 1.0
const pylonWidth = 0.4;
const frameTopLength = 1 + clothWidth;

const textSize = 0.33;
let capsule, capsuleBody, windVelocity;
let textObjects = [];

const afterimageParams = {
  enable: true,
};

const cameraStartingPos = new THREE.Vector3(-6.7, 9.3, 10);
// const cameraStartingPos = new THREE.Vector3(-10, 12, 8.7);

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
  // initGui();
  initPhysics();
  initObjects();
  initInput();
  initCameraMovement();
  initForgottens();
}

/* -------------------------------------------------------------------------- */
/*                                    scene                                   */
/* -------------------------------------------------------------------------- */

function initScene() {
  scene = new THREE.Scene();
  clock = new THREE.Clock();

  addLighting();

  const testGeo = new THREE.SphereGeometry(1);
  const testMat = new THREE.MeshBasicMaterial({ color: 0x000 });
  const testMesh = new THREE.Mesh(testGeo, testMat);
  // scene.add(testMesh);
  testMesh.position.set(
    scene.position.x - 3,
    scene.position.y + clothHeight - pylonWidth,
    scene.position.z - 3 + pylonWidth
  );

  axesHelper = getAxesHelper(10);
  // scene.add(axesHelper);
  gridHelper = getGridHelper(100);
  // scene.add(gridHelper);
  dLightHelper = getDLightHelper();
  // scene.add(dLightHelper);
  dLightShadowHelper = getDLightShadowHelper();
  // scene.add(dLightShadowHelper);

  const scale = 90;
  const vertOffset = 3;
  camera = new THREE.OrthographicCamera(
    -window.innerWidth / scale,
    window.innerWidth / scale,
    window.innerHeight / scale + vertOffset,
    -window.innerHeight / scale + vertOffset,
    -1000,
    1000
  );

  scene.add(camera);
  camera.position.copy(cameraStartingPos);
  // camera.position.set(-15, pylonHeight / 2 - pylonWidth * 6, -pylonWidth);
  const sceneCenter = new THREE.Vector3(
    scene.position.x - 3,
    scene.position.y + clothHeight - pylonWidth,
    scene.position.z - clothWidth / 2 + pylonWidth * 2
  );
  camera.lookAt(scene);
  // camera.lookAt(testMesh);
  // console.log(testMesh.position);

  initRenderers();

  composer = new EffectComposer(webglrenderer);
  composer.addPass(new RenderPass(scene, camera));
  afterimagePass = new AfterimagePass(0.8); // damp visible range starts at ~0.6
  composer.addPass(afterimagePass);
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  const controls = new OrbitControls(camera, css3drenderer.domElement); // swap this for webglrenderer?
  controls.enabled = true;
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.update();
  // controls.addEventListener("change", function () {
  //   console.log("Camera position: ", camera.position);
  // });

  window.addEventListener("resize", onWindowResize);
}

/* -------------------------------------------------------------------------- */
/*                                     GUI                                    */
/* -------------------------------------------------------------------------- */

function initGui() {
  let gui = new GUI();

  var options = {
    gravity: -9.8,
  };

  const gravityFolder = gui.addFolder("gravity");
  gravityFolder.add(options, "gravity", -10, 20).onChange((val) => {
    gravityConstant = val;
    updateGravity();
  });
}

function updateGravity() {
  physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
  // btVector3 represents the gravity vector, which is set to affect the y-axis with a magnitude defined by gravityConstant
  physicsWorld
    .getWorldInfo()
    .set_m_gravity(new Ammo.btVector3(0, gravityConstant, 0));
  // sets gravity by retrieving the world info object from physicsWorld and setting its gravity property to the same btVector3
}

/* -------------------------------------------------------------------------- */
/*                                  renderers                                 */
/* -------------------------------------------------------------------------- */

function initRenderers() {
  webglrenderer = new THREE.WebGLRenderer();
  webglrenderer.setPixelRatio(window.devicePixelRatio);
  webglrenderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(webglrenderer.domElement);
  webglrenderer.setClearColor(0xeeeef6, 1);

  css3drenderer = new CSS3DRenderer();
  css3drenderer.setSize(window.innerWidth, window.innerHeight);
  css3drenderer.domElement.style.position = "absolute";
  css3drenderer.domElement.style.top = 0;
  document.body.appendChild(css3drenderer.domElement);
}

/* -------------------------------------------------------------------------- */
/*                                   physics                                  */
/* -------------------------------------------------------------------------- */

function initPhysics() {
  const collisionConfiguration =
    new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
  // configuration object used for collision detection between soft bodies and rigid bodies
  const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  // responsible for dispatching collision events between objects
  const broadphase = new Ammo.btDbvtBroadphase();
  // a broad-phase collision detection algorithm used to efficiently narrow down potential collision pairs
  const solver = new Ammo.btSequentialImpulseConstraintSolver();
  // a solver used to resolve constraints and simulate physics interactions
  const softBodySolver = new Ammo.btDefaultSoftBodySolver();
  // a solver specifically designed for simulating soft bodies
  physicsWorld = new Ammo.btSoftRigidDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfiguration,
    softBodySolver
  );
  // a physics world where soft and rigid bodies interact
  physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
  // btVector3 represents the gravity vector, which is set to affect the y-axis with a magnitude defined by gravityConstant
  physicsWorld
    .getWorldInfo()
    .set_m_gravity(new Ammo.btVector3(0, gravityConstant, 0));
  // sets gravity by retrieving the world info object from physicsWorld and setting its gravity property to the same btVector3
  transformAux = new Ammo.btTransform();
  // new instance of btTransform represents a transformation in 3D space
  // in other words, a temporary ammo.js transform object
}

/* -------------------------------------------------------------------------- */
/*                                scene objects                               */
/* -------------------------------------------------------------------------- */

function initObjects() {
  const pos = new THREE.Vector3();
  // const quat = new THREE.Quaternion(); // orig!
  const quat = new THREE.Euler();

  /* -------------------------- cloth graphic object -------------------------- */

  const clothNumSegmentsZ = clothWidth * 6; // more segments = more wrinkling
  const clothNumSegmentsY = clothHeight * 6;

  // const clothPos = new THREE.Vector3(-3, 3, 2);

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

  // console.log(clothGeometry.attributes.position); // why does this produce float32array?

  const clothMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });
  cloth = new THREE.Mesh(clothGeometry, clothMaterial);
  cloth.castShadow = true;
  cloth.receiveShadow = true;
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
  sbConfig.set_viterations(10); // used to set the number of velocity iterations for the soft body simulation.
  sbConfig.set_piterations(10); // used to set the number of position iterations for the soft body simulation.
  // these lines of code adjust the accuracy and performance trade-offs of the soft body simulation.
  // Higher values for both iterations can improve the accuracy of the simulation but may impact performance,
  // while lower values can increase performance but might result in less accurate physics behavior

  clothSoftBody.setTotalMass(0.9, false);
  Ammo.castObject(clothSoftBody, Ammo.btCollisionObject)
    .getCollisionShape()
    .setMargin(margin * 3);
  physicsWorld.addSoftBody(clothSoftBody, 1, -1);
  cloth.userData.physicsBody = clothSoftBody;
  // Disable deactivation
  clothSoftBody.setActivationState(4);

  /* --------------------------------- window --------------------------------- */

  const frameMass = 1;
  const baseMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("rgb(0, 0, 0)"),
    transparent: true,
    opacity: 0.001,
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
  // Glue frame together
  // FoR = frame of referencee
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

  // Glue the cloth to frame
  influence = 1;
  // By setting influence to a value between 0 and 1, you can control the stiffness or rigidity of the connections between the anchor and the soft body.
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
/*                                 forgottens                                 */
/* -------------------------------------------------------------------------- */

function initForgottens() {
  forgottens.forEach((forgotten, i) => {
    if (forgotten.type === "factual") {
      triedFactuals.push(i);
    } else if (forgotten.type === "ancestral") {
      triedAncestrals.push(i);
    } else if (forgotten.type === "logistical") {
      triedLogisticals.push(i);
    } else if (forgotten.type === "sentimental") {
      triedSentimentals.push(i);
    }
  });

  // console.log("triedAncestrals: ", triedAncestrals);
  // console.log("triedFactuals: ", triedFactuals);
  // console.log("triedSentimentals: ", triedSentimentals);
  // console.log("triedLogisticals: ", triedLogisticals);
}

/* -------------------------------------------------------------------------- */
/*                               render + resize                              */
/* -------------------------------------------------------------------------- */

function render() {
  const deltaTime = clock.getDelta();
  updatePhysics(deltaTime);
  webglrenderer.render(scene, camera);
  css3drenderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  webglrenderer.setSize(window.innerWidth, window.innerHeight);
  css3drenderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

/* -------------------------------------------------------------------------- */
/*                                   updates                                  */
/* -------------------------------------------------------------------------- */

function update(renderer, scene, camera, clock) {
  window.requestAnimationFrame(update);
  render();
  afterimagePass.enabled = afterimageParams.enable;
  composer.render();
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

  setInterval(clearBodies, 1000);
  updateTextPositions();

  // if (wind) {
  //   console.log("wind happening");
  //   windBody.activate();
  //   windBody.applyCentralForce(windVelocity); // this doesnt do anything :')
  // }
}

function updateTextPositions() {
  for (let i = 0; i < textObjects.length; i++) {
    const capsule = rigidBodies[i];
    const textObject = textObjects[i];
    textObject.position.copy(capsule.position);
  }
}

/* -------------------------------------------------------------------------- */
/*                                   helpers                                  */
/* -------------------------------------------------------------------------- */

function getAxesHelper(size) {
  var helper = new THREE.AxesHelper(size);
  return helper;
}

function getGridHelper(size) {
  var helper = new THREE.GridHelper(size, 60);
  return helper;
}

function getDLightHelper() {
  var helper = new THREE.DirectionalLightHelper(directionalLight);
  return helper;
}

function getDLightShadowHelper() {
  var helper = new THREE.CameraHelper(directionalLight.shadow.camera);
  return helper;
}

function addStartingPosHelper() {
  const geo = new THREE.BoxGeometry(-3, clothHeight, clothWidth);

  const mat = new THREE.MeshBasicMaterial({ color: 0x000 });

  const helper = new THREE.Mesh(geo, mat);

  helper.position.set(
    clothPos.x / 2 - 3,
    clothPos.y + clothHeight / 2,
    clothPos.z - clothWidth / 2 - pylonWidth
  );
  scene.add(helper);
}

/* -------------------------------------------------------------------------- */
/*                                  lighting                                  */
/* -------------------------------------------------------------------------- */

function addLighting() {
  directionalLight = getDirectionalLight(1);
  directionalLight.position.set(-100, 100, 50);
  // scene.add(directionalLight);
  ambientLight = getAmbientLight(1);
  // scene.add(ambientLight);

  const offset = 3;
  const rectX = -6;
  const rectLight = new THREE.RectAreaLight(
    0x4e00ff,
    1,
    frameTopLength,
    pylonHeight
  );
  rectLight.position.set(rectX, pylonHeight, offset);
  rectLight.rotation.set(0, -Math.PI / 2, 0);
  rectLight.lookAt(clothPos);
  scene.add(rectLight);
  // let rectLightHelper = new RectAreaLightHelper(rectLight);
  // scene.add(rectLightHelper);

  const rectLight_1 = new THREE.RectAreaLight(
    0xdbfeb8,
    1,
    frameTopLength,
    pylonHeight
  );
  rectLight_1.position.set(rectX, pylonHeight, -offset);
  rectLight_1.rotation.set(0, -Math.PI / 2, 0);
  rectLight_1.lookAt(clothPos);
  scene.add(rectLight_1);
  // let rectLightHelper_1 = new RectAreaLightHelper(rectLight_1);
  // scene.add(rectLightHelper_1);
}

function getDirectionalLight(intensity) {
  var light = new THREE.DirectionalLight(0xffffff, intensity);
  // directional light produces rays that are all parallel to each other
  light.castShadow = true;
  light.shadow.mapSize.width = 1024;
  light.shadow.camera.near = 1;
  light.shadow.camera.far = 500;
  var scale = 1.75;
  return light;
}

function getAmbientLight(intensity) {
  var light = new THREE.AmbientLight("rgb(10, 30, 50)", intensity);
  // ambient light does not cast shadows
  return light;
}
/* -------------------------------------------------------------------------- */
/*                               camera movement                              */
/* -------------------------------------------------------------------------- */

function initCameraMovement() {
  document.addEventListener("DOMContentLoaded", (ev) => {
    gsap.registerPlugin(MotionPathPlugin);
    const keyframes = [
      new THREE.Vector3(6, 4, 2),
      new THREE.Vector3(0, 2, -2),
      // { x: 6, y: 4, z: 2 },
      // { x: 0, y: 2, z: -2 },
      // cameraStartingPos,
    ];
    // const keyframes = [
    //   { x: 6, y: 4, z: 2 },
    //   { x: 0, y: 2, z: -2 },
    //   // cameraStartingPos,
    // ];
    const TL = gsap.timeline();

    TL.from(camera.position, {
      motionPath: {
        path: keyframes,
        align: keyframes,
        alignOrigin: [0.5, 0.5], // sets the origin at the center of the obj
        autoRotate: true,
        // type: "cubic",
      },
      duration: 2,
      ease: "power4.out",
      onUpdate: () => {
        camera.lookAt(0, 0, 0); // don't think this works
      },
    });

    TL.kill();
  });
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

// function createSphere(sr, mass, pos, eu, material) {
//   const threeObject = new THREE.Mesh(
//     new THREE.SphereGeometry(sr, 16, 32),
//     material
//   );
//   const shape = new Ammo.btSphereShape(sr); // does radius need to be divided by 2?
//   shape.setMargin(margin);

//   createRigidBody(threeObject, shape, mass, pos, eu);

//   return threeObject;
// }

const fSz = 1;

function createCapsule(length, pos, canvasTexture) {
  const radius = fSz;
  // const radius = textSize;
  const threeObject = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfdfd00,
      transparent: false,
      opacity: 1,
      map: canvasTexture,
    })
  );

  threeObject.rotateZ(-Math.PI / 2);
  const directionToCamera = new THREE.Vector3().subVectors(
    cameraStartingPos,
    threeObject.position
  ); // calculate direction by taking the difference of 2 vectors

  // threeObject.lookAt(cameraStartingPos);
  const angle = Math.atan2(directionToCamera.x, directionToCamera.z);
  threeObject.rotateY(angle);

  const eu = new THREE.Euler().setFromQuaternion(threeObject.quaternion);

  const shape = new Ammo.btCapsuleShape(radius, length);
  shape.setMargin(margin);

  createRigidBody(threeObject, shape, 2, pos, eu);

  return threeObject;
}

function getTextureAndWidth(text) {
  if (!text) return null;

  const ctx = document.createElement("canvas").getContext("2d");
  document.body.appendChild(ctx.canvas); // Temporarily add to body to see the result

  const font = `${fSz}px sans serif`;
  ctx.font = font;
  const textMetrics = ctx.measureText(text); // pixels, dependent on fSz
  console.log("measure text", textMetrics);
  if (textMetrics.width === 0) return null; // Handle zero width

  const w = fSz;
  const h = textMetrics.width + fSz;

  ctx.canvas.width = w;
  ctx.canvas.height = h;

  ctx.fillStyle = "rgba(255, 255, 255, 0.01)";
  ctx.fillRect(0, 0, w, h);

  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.textBaseline = "middle";

  ctx.translate(fSz / 2, h - fSz / 2); // Adjust starting point for text rotation
  ctx.rotate(-Math.PI / 2); // Rotate the canvas to draw vertical text

  ctx.fillStyle = "rgba(55, 55, 255)"; // text color
  ctx.fillText(text, 0, 0);
  console.log("canvas :::: ", ctx.canvas);
  // ctx.save();

  const t = new THREE.CanvasTexture(ctx.canvas);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(1, 1);
  t.offset.set(0, 0);
  // t.offset.set(1 - textMetrics.width / w, 0);

  t.generateMipmaps = false; // Disable mipmaps
  t.needsUpdate = true; // Ensure the texture is updated

  return {
    texture: t,
    length: h - fSz,
  };
}

function createTextElAsync(text, pos) {
  return new Promise((resolve, reject) => {
    const el = document.createElement("div");
    el.className = `css3d-text`;
    el.textContent = text;

    const obj = new CSS3DObject(el);
    obj.position.copy(pos);

    // Append the element to the document body
    document.body.appendChild(obj.element);
    // obj.lookAt(cameraStartingPos);

    // Wait for the next frame update using requestAnimationFrame
    requestAnimationFrame(() => {
      const computedStyle = window.getComputedStyle(obj.element);
      const width = parseFloat(computedStyle.width);
      const height = parseFloat(computedStyle.height);
      resolve({ obj, width, height });
    });
  });
}

function createRigidBody(threeObject, physicsShape, mass, pos, eu) {
  threeObject.position.copy(pos);
  // threeObject.quaternion.copy(quat);

  // const position = new THREE.Vector3().copy(pos);
  const euler = new THREE.Quaternion().setFromEuler(eu);

  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  // transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
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

function clearBodies() {
  const ww = window.innerWidth / 2;
  const wh = window.innerHeight / 2;

  for (let i = 0; i < rigidBodies.length; i++) {
    const capsule = rigidBodies[i];
    const textObj = textObjects[i];
    const pos = capsule.position;

    // not the most precise method, since ww wh are 2D and also do not factor in camera angle. but it'll do for now
    if (pos.x < -ww || pos.x > ww || pos.y < -wh || pos.y > wh) {
      console.log("removed capsule and text object at ", pos);

      scene.remove(capsule); // remove body from scene
      physicsWorld.removeRigidBody(capsule.userData.physicsBody); // remove physics body from simulation
      scene.remove(textObj);

      rigidBodies.splice(i, 1);
      textObjects.splice(i, 1);
      i--; // update counter to new array length
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                 interaction                                */
/* -------------------------------------------------------------------------- */

function initInput() {
  let widthMatch = window.matchMedia("(max-width: 700px)");

  if (widthMatch.matches) {
    window.addEventListener("touchstart", createWind);
  } else {
    window.addEventListener("click", createWind);
  }

  widthMatch.addEventListener("change", function (mm) {
    if (mm.matches) {
      window.removeEventListener("click", createWind);
      window.addEventListener("touchstart", createWind);
      console.log("tracking touch events");
    } else {
      window.removeEventListener("touchstart", createWind);
      window.addEventListener("click", createWind);
      console.log("tracking click events");
    }
  });
}

async function createWind() {
  const startingPos = new THREE.Vector3(
    THREE.MathUtils.randFloat(clothPos.x / 2 - 9, clothPos.x / 2 - 5), // x
    THREE.MathUtils.randFloat(
      clothPos.y + clothHeight / 2,
      clothPos.y + clothHeight
    ), // y
    THREE.MathUtils.randFloat(
      clothPos.z - clothWidth - pylonWidth,
      clothPos.z - pylonWidth
    ) // z
  );

  if (triedToRemembers.length === forgottens.length) {
    isDone = true;
    console.log("you've forgotten everything");
    // console.log("influence: ", influence);
    // influence = 0; // this doesn't work
    return;
  }

  const index = Math.floor(Math.random() * forgottens.length);
  console.log("this forgotten", forgottens[index].forgotten);
  // const { obj: textObject, width: textW } = await createTextElAsync(
  //   forgottens[index].forgotten,
  //   startingPos
  // );
  let d = getTextureAndWidth(forgottens[index].forgotten);
  capsule = createCapsule(d.length, startingPos, d.texture);
  // scene.add(textObject);
  // textObjects.push(textObject);
  triedToRemembers.push(index);

  capsuleBody = capsule.userData.physicsBody;
  capsuleBody.setLinearVelocity(windVelocity); // comment this back in!
  // capsuleBody.setLinearVelocity(new Ammo.btVector3(0.1, 0, 0)); // comment this back in!
  // setTimeout(() => {
  //   capsuleBody.setLinearVelocity(windVelocity); // comment this back in!
  // }, 1000);
}
