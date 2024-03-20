// https://github.com/mrdoob/three.js/blob/master/examples/physics_ammo_cloth.html#L423
// https://medium.com/@bluemagnificent/intro-to-javascript-3d-physics-using-ammo-js-and-three-js-dd48df81f591
// https://stackoverflow.com/questions/45947570/how-to-attach-an-event-listener-to-the-dom-depending-upon-the-screen-size

import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
// import { gsap } from "gsap";
import { RectAreaLightHelper } from "three/addons/helpers/RectAreaLightHelper.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import forgottens from "./forgottens.json" assert { type: "json" };

var scene, clock, camera, renderer;
var directionalLight, ambientLight;
var axesHelper, gridHelper, dLightHelper, dLightShadowHelper;
let gui;
let bloomPass, composer;

const bloomParams = {
  exposure: 1,
  strength: 0.3,
  threshold: 0,
  radius: 0,
};

let physicsWorld;
const gravityConstant = -9.8;
const margin = 0.05;
let transformAux;
const rigidBodies = [];

let cloth;
const clothWidth = 8;
const clothHeight = 10;
const clothPos = new THREE.Vector3(-3, 0, 2); // bottom right corner?
const pylonHeight = clothPos.y + clothHeight;
const pylonWidth = 0.4;
const frameTopLength = 1 + clothWidth;

let wind, windBody, windVelocity;

const cameraStartingPos = new THREE.Vector3(
  -15,
  pylonHeight / 2 - pylonWidth * 6,
  -pylonWidth
);

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
  initInput();
  initCameraMovement();
}

/* -------------------------------------------------------------------------- */
/*                                 initialize                                 */
/* -------------------------------------------------------------------------- */

function initScene() {
  scene = new THREE.Scene();
  clock = new THREE.Clock();

  addLighting();

  axesHelper = getAxesHelper(10);
  // scene.add(axesHelper);
  gridHelper = getGridHelper(100);
  // scene.add(gridHelper);
  dLightHelper = getDLightHelper();
  // scene.add(dLightHelper);
  dLightShadowHelper = getDLightShadowHelper();
  // scene.add(dLightShadowHelper);

  gui = new GUI();

  const scale = 150;
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
  camera.lookAt(scene.position);

  // scene.background = new THREE.Color(0xffffff);
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  // update(renderer, scene, camera, clock);
  // renderer.shadowMap.enabled = true;
  renderer.setClearColor(0xffffff, 1);

  /*
  const renderScene = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85
  );
  bloomPass.threshold = bloomParams.threshold;
  bloomPass.strength = bloomParams.strength;
  bloomPass.radius = bloomParams.radius;

  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass); // this defaults any unlit area (e.g. bg) to black
  */

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  window.addEventListener("resize", onWindowResize);
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

  const clothNumSegmentsZ = clothWidth * 5;
  const clothNumSegmentsY = clothHeight * 5;

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

  const frameMass = 8;
  const baseMaterial = new THREE.MeshPhongMaterial({ color: 0xc1a06b });

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
  frameLeft.castShadow = true;
  frameLeft.receiveShadow = true;

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
  frameRight.castShadow = true;
  frameRight.receiveShadow = true;

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
  frameTop.castShadow = true;
  frameTop.receiveShadow = true;

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
  frameBottom.castShadow = true;
  frameBottom.receiveShadow = true;

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
  const influence = 1;
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
  windVelocity = new Ammo.btVector3(5, 0, 0); // move away from user
  // windVelocity = new Ammo.btVector3(-5, 0, 0); // move toward user
  const velocityData = {
    x: windVelocity.x(),
    y: windVelocity.y(),
    z: windVelocity.z(),
  };
  const velocityFolder = gui.addFolder("velocity");
  velocityFolder
    .add(velocityData, "x", -10, 10)
    .name("x")
    .onChange((value) => {
      windVelocity.setX(value);
    });
  velocityFolder
    .add(velocityData, "y", -5, 5)
    .name("y")
    .onChange((value) => {
      windVelocity.setY(value);
    });
  // velocityFolder
  //   .add(velocityData, "z", -5, 5)
  //   .name("z")
  //   .onChange((value) => {
  //     windVelocity.setZ(value);
  //   });
  // const bloomFolder = gui.addFolder("bloom effect");
  // bloomFolder.add(bloomParams, "exposure", 0.1, 2).onChange(function (value) {
  //   renderer.toneMappingExposure = Math.pow(value, 4.0);
  // });
  // bloomFolder
  //   .add(bloomParams, "threshold", 0.0, 1.0)
  //   .onChange(function (value) {
  //     bloomPass.threshold = Number(value);
  //   });
  // bloomFolder.add(bloomParams, "strength", 0.0, 3.0).onChange(function (value) {
  //   bloomPass.strength = Number(value);
  // });
  // bloomFolder
  //   .add(bloomParams, "radius", 0.0, 1.0)
  //   .step(0.01)
  //   .onChange(function (value) {
  //     bloomPass.radius = Number(value);
  //   });
}

/* -------------------------------------------------------------------------- */
/*                                   update                                   */
/* -------------------------------------------------------------------------- */

function update(renderer, scene, camera, clock) {
  // window.requestAnimationFrame(function () {
  //   update(renderer, scene, camera, clock);
  // });
  window.requestAnimationFrame(update);
  render();
  // composer.render();
}

/* -------------------------------------------------------------------------- */
/*                               render + resize                              */
/* -------------------------------------------------------------------------- */

function render() {
  const deltaTime = clock.getDelta();
  updatePhysics(deltaTime);
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

/* -------------------------------------------------------------------------- */
/*                               update physics                               */
/* -------------------------------------------------------------------------- */

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

  // if (wind) {
  //   windBody.applyCentralForce(windVelocity); // this doesnt do anything :')
  // }
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
    0xffe500,
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
    0x4e00ff,
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

function createSphere(sr, mass, pos, eu, material) {
  const threeObject = new THREE.Mesh(
    new THREE.SphereGeometry(sr, 16, 32),
    material
  );
  const shape = new Ammo.btSphereShape(sr); // does radius need to be divided by 2?
  shape.setMargin(margin);

  createRigidBody(threeObject, shape, mass, pos, eu);

  return threeObject;
}

function createText(text, cb) {
  const loader = new FontLoader();

  loader.load("./assets/IBM Plex Sans Light_Regular.json", function (font) {
    const geo = new TextGeometry(text, {
      font: font,
      size: 0.33,
      height: 0.5,
      // bevelEnabled: true,
      // bevelThickness: 0.01,
      // bevelSize: 8,
      // bevelOffset: 0,
      // bevelSegments: 5,
    });

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 1,
    });

    const mesh = new THREE.Mesh(geo, mat);

    cb(mesh); // callback
  });
}

function createTextRB(text, pos, eu) {
  return new Promise((resolve, reject) => {
    createText(text, function (mesh) {
      let shape = new Ammo.btConvexHullShape();
      let vertices = mesh.geometry.attributes.position.array;

      for (let i = 0; i < vertices.length; i += 3) {
        shape.addPoint(
          new Ammo.btVector3(vertices[i], vertices[i + 1], vertices[i + 2])
        );
      }
      createRigidBody(mesh, shape, 1, pos, eu);
      resolve(mesh);
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

  const localInertia = new Ammo.btVector3(0, 0, 0);
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

  if (mass > 0) {
    rigidBodies.push(threeObject);

    // Disable deactivation
    body.setActivationState(4);
  }

  physicsWorld.addRigidBody(body);
}

/* -------------------------------------------------------------------------- */
/*                                 interaction                                */
/* -------------------------------------------------------------------------- */

function initInput() {
  async function createWind() {
    const startingPos = new THREE.Vector3(
      // THREE.MathUtils.randFloat(-3, 0), // x, move toward user
      THREE.MathUtils.randFloat(clothPos.x - 3, clothPos.x), // x, move away from user
      THREE.MathUtils.randFloat(0, pylonHeight), // y
      THREE.MathUtils.randFloat(0, clothPos.z - frameTopLength) // z
    );
    // const quat = new THREE.Quaternion(0, 0, 0, 1);
    const eulerPos = new THREE.Euler(0, -Math.PI / 2, 0);

    // wind = createSphere(
    //   1,
    //   1,
    //   startingPos,
    //   eulerPos,
    //   new THREE.MeshBasicMaterial({
    //     color: 0x333333,
    //     transparent: true,
    //     opacity: 0.8,
    //   })
    // );

    let index = Math.floor(Math.random() * forgottens.length);
    // wind = await createTextRB(
    //   forgottens[index].forgotten,
    //   startingPos,
    //   eulerPos
    // );

    wind = await createTextRB("x", startingPos, eulerPos);
    // wind = createTextRB("x", startingPos, quat); // orig!

    windBody = wind.userData.physicsBody;
    windBody.setLinearVelocity(windVelocity);
  }

  async function blowWind() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();

      /* The AnalyserNode interface represents a node able to provide real-time frequency 
    and time-domain analysis information. It is an AudioNode that passes the audio stream 
    unchanged from the input to the output, but allows you to take the generated data, 
    process it, and create audio visualizations */

      source.connect(analyzer);
      // analyzer.connect(audioContext.destination);

      function updateVolume() {
        const bufferLength = analyzer.frequencyBinCount;
        // represents the number of data points (frequency bins) that will be available for analysis
        // larger buffer length provides more detailed frequency info but requires more processing power

        const dataArray = new Uint8Array(bufferLength);

        analyzer.getByteFrequencyData(dataArray);
        // get audio data and store it in an array

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const volume = sum / bufferLength;
        // calculate the average volume by summing the values in dataArray and dividing by the buffer length
        if (volume > 5) {
          createWind();
          // console.log("Mic volume:", volume);
        }
      }

      setInterval(updateVolume, 200); // Adjust the interval as needed
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }

  function spaceWind(ev) {
    if (ev.keyCode == 32) {
      createWind();

      /*
        gui
          .add(wind.geometry.parameters, "radius", 0.5, 5)
          .name("size")
          .onChange((value) => {
            wind.geometry.parameters.radius = value;
          });
        */
    }
  }

  let widthMatch = window.matchMedia("(max-width: 700px)");

  if (widthMatch.matches) {
    blowWind();
  } else {
    window.addEventListener("keydown", spaceWind);
  }

  widthMatch.addEventListener("change", function (mm) {
    if (mm.matches) {
      window.removeEventListener("keydown", spaceWind);
      blowWind();
      console.log("mic input method");
    } else {
      window.addEventListener("keydown", spaceWind);
      // window.removeEventListener(..., blowWind);
      console.log("keyboard input method");
    }
  });
}
