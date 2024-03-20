/* --------------------------- option 1: btGeneric -------------------------- */
// const frameInA = new Ammo.btTransform();
// frameInA.setIdentity();
// // represents the initial transforms (positions and orientations) of the arm

// const frameInB = new Ammo.btTransform();
// frameInB.setIdentity();

// const frameInC = new Ammo.btTransform();
// frameInC.setIdentity();

// const APLConstraint = new Ammo.btGeneric6DofConstraint(
//   arm.userData.physicsBody, // replace with rigid body for arm
//   pylonLeft.userData.physicsBody, // replace with rigid body for left pylon
//   frameInA,
//   frameInB,
//   true
// );

// const APRConstraint = new Ammo.btGeneric6DofConstraint(
//   arm.userData.physicsBody,
//   pylonRight.userData.physicsBody,
//   frameInA,
//   frameInC,
//   true
// );

// physicsWorld.addConstraint(APLConstraint, true);
// physicsWorld.addConstraint(APRConstraint, true);

/* ------------------------------ option 2: p2p ----------------------------- */

/*
  const armStartPivot = new Ammo.btVector3(
    clothPos.x,
    pylonHeight + baseHeight,
    clothPos.z - 0.5 * armLength
  );

  // const armEndPivot = new Ammo.btVector3(
  //   clothPos.x,
  //   pylonHeight + baseHeight,
  //   clothPos.z
  // );

  const pylonLPivot = new Ammo.btVector3(
    clothPos.x,
    0.5 * pylonHeight,
    clothPos.z - armLength
  );

  // const pylonRPivot = new Ammo.btVector3(
  //   clothPos.x,
  //   0.5 * pylonHeight,
  //   clothPos.z
  // );
  */

/* -------------------- Hinge constraint to move the arm -------------------- */
// const pivotA = new Ammo.btVector3(0, pylonHeight * 0.5, 0);
// const pivotB = new Ammo.btVector3(0, -baseHeight, -armLength * 0.5);
// const axis = new Ammo.btVector3(0, 1, 0);
// hinge = new Ammo.btHingeConstraint(
//   pylon.userData.physicsBody,
//   arm.userData.physicsBody,
//   pivotA,
//   pivotB,
//   axis,
//   axis,
//   true
// );
// physicsWorld.addConstraint(hinge, true);

/* ---------------------------- in updatePhysics ---------------------------- */
// Hinge control
// if (hinge) {
//   hinge.enableAngularMotor(true, 0.8 * armMovement, 50);
// }
// enableAngularMotor turns the child based on the axis value provided as a parameter

/* -------------------------------------------------------------------------- */
/*                                   other?                                   */
/* -------------------------------------------------------------------------- */

// windVelocity = new THREE.Vector3(5, 0, 0); // doesn't work

// console.log(windBody); // why does this return a rigidbody?
// console.log(windVelocity); // why does this return a rigidbody?

// if (wind) {
//   // console.log("wind on");
//   windBody.applyCentralForce(windVelocity);
// }

/* -------------------------------- arm / base ------------------------------ */

const armMass = 2;
const baseHeight = 0.2;
const baseMaterial = new THREE.MeshPhongMaterial({ color: 0xc1a06b });

pos.set(clothPos.x, 0.1, clothPos.z - armLength);
quat.set(0, 0, 0, 1);
const baseLeft = createParalellepiped(
  1,
  baseHeight,
  1,
  0,
  pos,
  quat,
  baseMaterial
);
baseLeft.castShadow = true;
baseLeft.receiveShadow = true;

pos.set(clothPos.x, 0.1, clothPos.z);
quat.set(0, 0, 0, 1);
const baseRight = createParalellepiped(
  1,
  baseHeight,
  1,
  0,
  pos,
  quat,
  baseMaterial
);
baseRight.castShadow = true;
baseRight.receiveShadow = true;

pos.set(clothPos.x, 0.5 * pylonHeight, clothPos.z - armLength);
const pylonLeft = createParalellepiped(
  0.4,
  pylonHeight,
  0.4,
  0,
  pos,
  quat,
  baseMaterial
);
pylonLeft.castShadow = true;
pylonLeft.receiveShadow = true;

pos.set(clothPos.x, 0.5 * pylonHeight, clothPos.z);
const pylonRight = createParalellepiped(
  0.4,
  pylonHeight,
  0.4,
  0,
  pos,
  quat,
  baseMaterial
);
pylonRight.castShadow = true;
pylonRight.receiveShadow = true;

pos.set(clothPos.x, pylonHeight + baseHeight, clothPos.z - 0.5 * armLength);
const arm = createParalellepiped(
  0.4,
  0.4,
  armLength + 0.4,
  armMass,
  pos,
  quat,
  baseMaterial
);
arm.castShadow = true;
arm.receiveShadow = true;

/* ------------------------------- constraints ------------------------------ */
// Glue arm to left and right pylon
const armStartPivot = new Ammo.btVector3(0, 0, -armLength / 2); // relative to the shape's origin
const armEndPivot = new Ammo.btVector3(0, 0, armLength / 2);
const pylonLPivot = new Ammo.btVector3(0, pylonHeight / 2, 0);
const pylonRPivot = new Ammo.btVector3(0, pylonHeight / 2, 0);

const p2p_L = new Ammo.btPoint2PointConstraint(
  arm.userData.physicsBody,
  pylonLeft.userData.physicsBody,
  armStartPivot,
  pylonLPivot
);
physicsWorld.addConstraint(p2p_L, false);

const p2p_R = new Ammo.btPoint2PointConstraint(
  arm.userData.physicsBody,
  pylonRight.userData.physicsBody,
  armEndPivot,
  pylonRPivot
);
physicsWorld.addConstraint(p2p_R, false);

// Glue the cloth to the arm
const influence = 0.5;
// By setting influence to a value between 0 and 1, you can control the stiffness or rigidity of the connections between the anchor and the soft body.
// Higher values make the connection more rigid, while lower values allow for more flexibility and deformation.
clothSoftBody.appendAnchor(0, arm.userData.physicsBody, false, influence);
clothSoftBody.appendAnchor(
  clothNumSegmentsZ,
  arm.userData.physicsBody,
  false,
  influence
);

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */

// Glue frame together
const ft_startPivot = new Ammo.btVector3(0, 0, -armLength / 2); // all relative to the shape's origin
const ft_endPivot = new Ammo.btVector3(0, 0, armLength / 2);
const fb_startPivot = new Ammo.btVector3(0, 0, -armLength / 2);
const fb_endPivot = new Ammo.btVector3(0, 0, armLength / 2);
const fl_topPivot = new Ammo.btVector3(0, pylonHeight / 2, 0);
const fr_topPivot = new Ammo.btVector3(0, pylonHeight / 2, 0);
const fl_bottomPivot = new Ammo.btVector3(0, -pylonHeight / 2, 0);
const fr_bottomPivot = new Ammo.btVector3(0, -pylonHeight / 2, 0);

// top left
const p2p_TL = new Ammo.btPoint2PointConstraint(
  arm.userData.physicsBody,
  frameLeft.userData.physicsBody,
  ft_startPivot,
  fl_topPivot
);
physicsWorld.addConstraint(p2p_TL, false);

// top right
const p2p_TR = new Ammo.btPoint2PointConstraint(
  arm.userData.physicsBody,
  frameRight.userData.physicsBody,
  ft_endPivot,
  fr_topPivot
);
physicsWorld.addConstraint(p2p_TR, false);

// bottom left
const p2p_BL = new Ammo.btPoint2PointConstraint(
  arm.userData.physicsBody,
  frameLeft.userData.physicsBody,
  fb_startPivot,
  fl_bottomPivot
);
physicsWorld.addConstraint(p2p_BL, false);

// bottom right
const p2p_BR = new Ammo.btPoint2PointConstraint(
  arm.userData.physicsBody,
  frameRight.userData.physicsBody,
  fb_endPivot,
  fr_bottomPivot
);
physicsWorld.addConstraint(p2p_BR, false);

// Glue the cloth to frame
const influence = 0.5;
// By setting influence to a value between 0 and 1, you can control the stiffness or rigidity of the connections between the anchor and the soft body.
// Higher values make the connection more rigid, while lower values allow for more flexibility and deformation.
clothSoftBody.appendAnchor(0, arm.userData.physicsBody, false, influence);
clothSoftBody.appendAnchor(
  clothNumSegmentsZ,
  arm.userData.physicsBody,
  false,
  influence
);

window.addEventListener("keyup", function () {
  // armMovement = 0;
  // console.log("up");
});

// console.log(windBody);
// console.log(windVelocity);
if (windBody instanceof Ammo.btRigidBody) {
  console.log(windBody.getLinearVelocity().x());
  console.log(windVelocity.x());
  console.log(windVelocity);

  // const velocity = windBody.getLinearVelocity();
  // const x = velocity.x();
  // const y = velocity.y();
  // const z = velocity.z();

  // console.log(`Linear Velocity: x = ${x}, y = ${y}, z = ${z}`);
}

// THREE.MathUtils.randFloat(clothPos.x - 3, clothPos.x), // x | -6 to -3

const cameraFolder = gui.addFolder("camera");
cameraFolder.add(camera.position, "x", -20, 20).onChange((value) => {
  camera.position.setX(value);
});
cameraFolder.add(camera.position, "y", -20, 20).onChange((value) => {
  camera.position.setY(value);
});
cameraFolder.add(camera.position, "z", -20, 20).onChange((value) => {
  camera.position.setZ(value);
});

// async function initAmmo() {
//   try {
//     const AmmoInstance = await Ammo();
//     // AmmoInstance is the resolved Ammo.js object
//     // Perform any additional initialization or setup here
//     // console.log(AmmoInstance);
//     return AmmoInstance;
//   } catch (error) {
//     console.error("Failed to initialize Ammo.js");
//   }
// }

// initAmmo()
//   .then((AmmoInstance) => {
//     // Ammo.js is initialized and ready to use
//     // You can perform further operations with the ammoInstance object
//     AmmoInstance = Ammo;

//     initScene();
//     initPhysics();
//     initObjects();
//     initInput();
//     update();
//   })
//   .catch((error) => {
//     console.error("Error initializing Ammo.js:", error);
//   });

let armMovement = 0;

// camera = new THREE.PerspectiveCamera(
//   100,
//   window.innerWidth / window.innerHeight,
//   0.1,
//   1000
// );

if (wind) {
  gui
    .add(wind.geometry.parameters, "radius", 0.5, 5)
    // .name("size")
    .onChange((value) => {
      wind.geometry.parameters.radius.set(value);
    });
  // gui
  //   .add(radius, "value", 0.5, 5)
  //   // .name("size")
  //   .onChange((value) => {
  //     radius = value;
  //   });
}

let textureLoader;
textureLoader = new THREE.TextureLoader();
// const bg = textureLoader.load("assets/006.hdr", () => {
//   const rt = new THREE.WebGL3DRenderTarget(bg.image.height);
//   rt.fromEquirectangularTexture(renderer, bg);
//   scene.background = rt.bg;
// });

// Convert the quaternion rotation to Euler angles
const euler = new THREE.Euler().setFromQuaternion(model.quaternion, "XYZ");

// Set the object's rotation using Euler angles
model.rotation.copy(euler);

// Clear the quaternion rotation
model.quaternion.identity();

// Calculate the current origin position
const currentOrigin = new THREE.Vector3();
currentOrigin.copy(model.position);

// const currentOrigin = new THREE.Vector3();
/* -------------------------------------------------------------------------- */
// model.traverse((node) => {
//   if (node.isMesh) {
//     const geo = node.geometry;
//     geo.computeBoundingBox();
//     geo.boundingBox.getCenter(currentOrigin);
//     console.log(currentOrigin);
//     console.log(currentOrigin.negate());
//     //     geo.attributes.position.set(0, 0, 0);
//   }
// });
/* -------------------------------------------------------------------------- */
// // Calculate the translation required to move the model to the origin
// const translation = currentOrigin.negate();

// // Create a new parent object and apply the translation
// const parentObject = new THREE.Group();
// parentObject.position.copy(translation);

// parentObject.add(model);
// // model.position.set(0, 0, 0, 0);
// model.rotateY(-Math.PI / 2);
// scene.add(parentObject);
// // model.position.set(6, -18, -25);
// const sc = 0.03;
// model.scale.set(sc, sc, sc);

const spotLight = new THREE.SpotLight(0xffffff, 1);
spotLight.position.set(4, 12, -pylonWidth);
spotLight.angle = Math.PI / 4;
spotLight.penumbra = 1;
spotLight.decay = 1;
spotLight.distance = 20;
spotLight.target = model;

const spotLightHelper = new THREE.SpotLightHelper(spotLight);
scene.add(spotLightHelper);

// point light
// const pLight = new THREE.PointLight(0xffffff, 0.75);
// scene.add(pLight);
// pLight.position.set(3, 4, -pylonWidth - 4);

// const pointLightHelper = new THREE.PointLightHelper(pLight, 1);
// scene.add(pointLightHelper);

// rect light

// const rectLight_2 = new THREE.RectAreaLight(
//   0xffffff,
//   1,
//   frameTopLength,
//   pylonHeight
// );
// rectLight_2.position.set(3, 10, -pylonWidth);
// rectLight_2.rotateY(-Math.PI / 2);
// rectLight_2.lookAt(model);
// scene.add(rectLight_2);
// let rectLightHelper_2 = new RectAreaLightHelper(rectLight_2);
// scene.add(rectLightHelper_2);

// directional light

// const dLight = getDirectionalLight(0.5);
// scene.add(dLight);
// dLight.position.set(3, 4, -pylonWidth);
// dLight.target = model;
// const dLightHelper = new THREE.DirectionalLightHelper(dLight);
// scene.add(dLightHelper);

model.traverse((child) => {
  if (child.children.length > 0) {
    child.traverse((grandchild) => {
      if (grandchild.isMesh) {
        const mat = grandchild.material;
        console.log(mat);
      } else {
        console.log("no materials found");
      }
    });
  }
});

window.onload = (ev) => {
  if (!gsap.isTweening(scene.rotation)) {
    gsap.from(scene.rotation, {
      duration: 2,
      x: 180,
      ease: "power4.out",
    });
  }
  // if (!gsap.isTweening(camera.position)) {
  //   gsap.from(camera.position, {
  //     duration: 2,
  //     x: 10,
  //     y: 10,
  //     ease: "power4.out",
  //     lookAt: scene.position,
  //   });
  // }
};

if (!gsap.isTweening(camera.position)) {
}

/* -------------------------------------------------------------------------- */
/*                                    html                                    */
/* -------------------------------------------------------------------------- */

// original method:
// "gsap": "https://cdn.skypack.dev/gsap@3.7.1"

// doc recommended link
// "gsap": "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.0/gsap.min.js"

/* -------- don't actually need switch and case if only one key event ------- */

function blowWind(event) {
  switch (event.keyCode) {
    // space
    case 32:
      const pos = new THREE.Vector3(
        // THREE.MathUtils.randFloat(-3, 0), // x, move toward user
        THREE.MathUtils.randFloat(clothPos.x - 3, clothPos.x), // x, move away from user
        THREE.MathUtils.randFloat(0, pylonHeight), // y
        THREE.MathUtils.randFloat(0, clothPos.z - frameTopLength) // z
      );
      const quat = new THREE.Quaternion(0, 0, 0, 1);

      wind = createSphere(
        1,
        1,
        pos,
        quat,
        new THREE.MeshBasicMaterial({
          color: 0x333333,
          transparent: true,
          opacity: 0.001,
        })
      );
      // console.log(wind);
      windBody = wind.userData.physicsBody;
      windBody.setLinearVelocity(windVelocity);

      /*
        gui
          .add(wind.geometry.parameters, "radius", 0.5, 5)
          .name("size")
          .onChange((value) => {
            wind.geometry.parameters.radius = value;
          });
        */

      break;
  }
}

/* -------------------------------------------------------------------------- */

if (window.innerWidth < 700) {
  console.log("mic input method");
  // window.addEventListener();
} else {
  console.log("keyboard input method");
  window.addEventListener("keydown", blowWind);
}

/* ------------------------------- audio scrap ------------------------------ */

// const analyserNode = new AnalyserNode(audioContext, { fftSize: 256 }); // replace frequencies with volume
// mic.connect(analyserNode);
const audioContext = new AudioContext();
const gainNode = new GainNode(audioContext, { gain: 1 });
const constraints = { audio: true, video: false };

navigator.mediaDevices
  .getUserMedia(constraints)
  .then(function (stream) {
    // if (audioContext.state === "suspended") {
    //   audioContext.resume();
    // }
    const analyzer = audioContext.createAnalyser();
    audioContext.audioWorklet.addModule("/vumeter-processor.js");
    const mic = audioContext.createMediaStreamSource(stream);
    // mic.connect(analyserNode);
    const node = new AudioWorkletNode(audioContext, "vumeter");

    node.port.onmessage = (event) => {
      let _volume = 0;
      let _sensibility = 5; // Just to add any sensibility to our equation
      if (event.data.volume) _volume = event.data.volume;
      leds((_volume * 100) / _sensibility);
    };
    mic.connect(node).connect(audioContext.destination);

    console.log(gainNode.gain.value);
  })
  .catch(function (err) {
    console.log(err);
  });

/* -------------------------------------------------------------------------- */
function blowWind() {
  try {
    navigator.mediaDevices.getUserMedia(
      { audio: true, video: false },
      onMicGranted,
      onMicDenied
    );
  } catch (error) {
    alert(error);
  }
}

function onMicDenied() {
  console.log("microphone access denied");
}

/* -------------------------------------------------------------------------- */

function blowWind() {
  try {
    navigator.mediaDevices.getUserMedia(
      { audio: true, video: false },
      onMicGranted
    );
  } catch (error) {
    alert(error);
  }
}

async function onMicGranted(stream) {
  console.log("microphone access granted");

  const audioContext = new AudioContext();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  await audioContext.audioWorklet.addModule("/vumeter-processor.js");
  const mic = audioContext.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(audioContext, "vumeter");

  node.port.onmessage = (event) => {
    let _volume = 0;
    if (event.data.volume) {
      _volume = event.data.volume;
    }
    console.log(_volume);
  };
  mic.connect(node).connect(audioContext.destination);
}

/* -------------------------------------------------------------------------- */

// function createTextRB(text, cb, pos, quat) {
//   const loader = new FontLoader();
//   let geo;
//   let mat;

//   loader.load("./assets/IBM Plex Sans Light_Regular.json", function (font) {
//     geo = new TextGeometry(text, {
//       font: font,
//       size: 1,
//       height: 0.5,
//       // bevelEnabled: true,
//       // bevelThickness: 10,
//       // bevelSize: 8,
//       // bevelOffset: 0,
//       // bevelSegments: 5,
//     });

//     mat = new THREE.MeshBasicMaterial({
//       color: 0xffffff,
//       opacity: 1,
//     });
//   });

//   const mesh = new THREE.Mesh(geo, mat);
//   mesh.position.set(0, 0, 0);

//   let posAtt = mesh.geometry.position.array;
//   console.log(posAtt);
//   if (posAtt) {
//     let vertices = posAtt.array;
//     console.log("posAtt = ", posAtt);
//     if (vertices) {
//       for (let i = 0; i < vertices.length; i += 3) {
//         shape.addPoint(
//           new Ammo.btVector3(vertices[i], vertices[i + 1], vertices[i + 2])
//         );
//       }
//       console.log("vertices = ", vertices);
//     } else {
//       console.error("Error with array property of posAtt: ", error);
//     }
//   } else {
//     console.error("Error with posAtt: ", error);
//   }

//   // let shape = new Ammo.btConvexHullShape();
//   // let vertices = mesh.geometry.attributes.position.array;
//   // for (let i = 0; i < vertices.length; i += 3) {
//   //   shape.addPoint(
//   //     new Ammo.btVector3(vertices[i], vertices[i + 1], vertices[i + 2])
//   //   );
//   // }
//   // createRigidBody(cb, shape, 1, pos, quat);
// }

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

// const cameraFolder = gui.addFolder("camera position");
// let cameraControls = {
//   x: camera.position.x,
//   y: camera.position.y,
//   z: camera.position.z,
// };

// cameraFolder
//   .add(cameraControls, "x", -50, 50)
//   .name("x")
//   .onChange((val) => {
//     camera.position.x = val;
//   });
// cameraFolder
//   .add(cameraControls, "y", -50, 50)
//   .name("y")
//   .onChange((val) => {
//     camera.position.y = val;
//   });
// cameraFolder
//   .add(cameraControls, "z", -50, 50)
//   .name("z")
//   .onChange((val) => {
//     camera.position.z = val;
//   });

/*
        gui
          .add(wind.geometry.parameters, "radius", 0.5, 5)
          .name("size")
          .onChange((value) => {
            wind.geometry.parameters.radius = value;
          });
        */

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
