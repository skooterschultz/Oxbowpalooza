const panels = Array.from(document.querySelectorAll("[data-panel-view]"));
const panelButtons = Array.from(document.querySelectorAll("[data-panel]"));

function setPanel(panelName) {
  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panelView === panelName);
  });

  panelButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panel === panelName);
  });
}

panelButtons.forEach((button) => {
  button.addEventListener("click", () => setPanel(button.dataset.panel));
});

function bootSunnyScene() {
  const canvas = document.querySelector("#scene-canvas");

  if (!canvas || !window.BABYLON) {
    return;
  }

  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: false,
    antialias: true,
  });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.48, 0.78, 0.96, 1);

  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    Math.PI / 2,
    Math.PI / 2.45,
    28,
    new BABYLON.Vector3(0, 1, 2),
    scene,
  );
  camera.attachControl(canvas, true);
  camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
  camera.lowerRadiusLimit = 22;
  camera.upperRadiusLimit = 36;
  camera.lowerBetaLimit = Math.PI / 3.2;
  camera.upperBetaLimit = Math.PI / 2.2;
  camera.wheelPrecision = 85;

  const sunLight = new BABYLON.HemisphericLight("sun", new BABYLON.Vector3(0.2, 1, 0.4), scene);
  sunLight.intensity = 1.05;

  const warmLight = new BABYLON.DirectionalLight("warm", new BABYLON.Vector3(-0.55, -1, 0.35), scene);
  warmLight.position = new BABYLON.Vector3(16, 16, -8);
  warmLight.intensity = 1.2;

  const makeMat = (name, color, roughness = 0.85) => {
    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseColor = BABYLON.Color3.FromHexString(color);
    mat.specularColor = new BABYLON.Color3(0.03, 0.03, 0.03);
    mat.roughness = roughness;
    return mat;
  };

  const grassMat = makeMat("grass", "#4f8b34");
  const pineMat = makeMat("pine", "#17432d");
  const trunkMat = makeMat("trunk", "#6b3a18");
  const riverMat = makeMat("river", "#1688c7");
  riverMat.alpha = 0.88;
  const mountainMat = makeMat("mountain", "#295b68");
  const snowMat = makeMat("snow", "#fff6e3");
  const cloudMat = makeMat("cloud", "#fff6df");
  cloudMat.alpha = 0.93;
  const sunMat = makeMat("sun", "#f49a25");
  sunMat.emissiveColor = BABYLON.Color3.FromHexString("#f49a25");
  sunMat.specularColor = BABYLON.Color3.Black();
  const logMat = makeMat("log", "#754018");

  const ground = BABYLON.MeshBuilder.CreateGround("field", { width: 46, height: 38 }, scene);
  ground.position.z = 2;
  ground.material = grassMat;

  const river = BABYLON.MeshBuilder.CreateRibbon(
    "river",
    {
      pathArray: [
        [
          new BABYLON.Vector3(-2.2, 0.035, -12),
          new BABYLON.Vector3(-3.1, 0.035, -6),
          new BABYLON.Vector3(-1.2, 0.035, 0),
          new BABYLON.Vector3(-2.9, 0.035, 7),
          new BABYLON.Vector3(-1.4, 0.035, 17),
        ],
        [
          new BABYLON.Vector3(2.2, 0.04, -12),
          new BABYLON.Vector3(1.1, 0.04, -6),
          new BABYLON.Vector3(3.2, 0.04, 0),
          new BABYLON.Vector3(1.6, 0.04, 7),
          new BABYLON.Vector3(3.8, 0.04, 17),
        ],
      ],
      closeArray: false,
      closePath: false,
      updatable: false,
    },
    scene,
  );
  river.material = riverMat;

  function makeMountain(name, x, z, height, width) {
    const mountain = BABYLON.MeshBuilder.CreateCylinder(
      name,
      { diameterTop: 0, diameterBottom: width, height, tessellation: 4 },
      scene,
    );
    mountain.position.set(x, height / 2, z);
    mountain.rotation.y = Math.PI / 4;
    mountain.material = mountainMat;

    const snow = BABYLON.MeshBuilder.CreateCylinder(
      `${name}-snow`,
      { diameterTop: 0, diameterBottom: width * 0.36, height: height * 0.34, tessellation: 4 },
      scene,
    );
    snow.position.set(x, height * 0.83, z);
    snow.rotation.y = Math.PI / 4;
    snow.material = snowMat;
  }

  makeMountain("hood", 0, 15, 8.8, 12);
  makeMountain("ridge-left", -8, 17, 5.8, 9);
  makeMountain("ridge-right", 8, 17, 5.4, 9);

  function makeTree(x, z, scale = 1) {
    const trunk = BABYLON.MeshBuilder.CreateCylinder(
      "tree-trunk",
      { diameter: 0.22 * scale, height: 1.05 * scale, tessellation: 8 },
      scene,
    );
    trunk.position.set(x, 0.52 * scale, z);
    trunk.material = trunkMat;

    const top = BABYLON.MeshBuilder.CreateCylinder(
      "tree-top",
      { diameterTop: 0, diameterBottom: 1.1 * scale, height: 2.2 * scale, tessellation: 9 },
      scene,
    );
    top.position.set(x, 1.8 * scale, z);
    top.material = pineMat;
    top.rotation.y = (x + z) * 0.15;
  }

  for (let i = 0; i < 46; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (5.8 + (i % 7) * 1.7 + Math.sin(i) * 0.8);
    const z = -10 + (i * 1.18) % 25;
    makeTree(x, z, 0.82 + (i % 5) * 0.1);
  }

  const sun = BABYLON.MeshBuilder.CreateSphere("sun-disc", { diameter: 4.8, segments: 24 }, scene);
  sun.position.set(-12, 10, 13);
  sun.material = sunMat;

  const clouds = [];
  function makeCloud(x, y, z, scale) {
    const cloud = new BABYLON.TransformNode("cloud", scene);
    const offsets = [
      [-0.9, 0, 0, 1.1],
      [0, 0.18, 0, 1.35],
      [0.9, 0, 0, 1],
      [0.25, -0.18, 0, 1.2],
    ];
    offsets.forEach(([ox, oy, oz, size]) => {
      const puff = BABYLON.MeshBuilder.CreateSphere(
        "cloud-puff",
        { diameter: size * scale, segments: 14 },
        scene,
      );
      puff.position.set(x + ox * scale, y + oy * scale, z + oz * scale);
      puff.scaling.y = 0.55;
      puff.material = cloudMat;
      puff.parent = cloud;
    });
    clouds.push(cloud);
  }

  makeCloud(-11, 8.8, 5, 1.2);
  makeCloud(9, 9.6, 7, 1.05);
  makeCloud(1, 11.2, 2, 0.86);

  const frame = new BABYLON.TransformNode("log-frame", scene);
  const leftLog = BABYLON.MeshBuilder.CreateCylinder("left-log", { diameter: 0.35, height: 6.4 }, scene);
  leftLog.position.set(-6.8, 3.2, -5.2);
  leftLog.rotation.z = Math.PI / 2;
  leftLog.material = logMat;
  leftLog.parent = frame;

  const rightLog = leftLog.clone("right-log");
  rightLog.position.y = 0.42;
  rightLog.parent = frame;

  const postA = BABYLON.MeshBuilder.CreateCylinder("post-a", { diameter: 0.35, height: 3.4 }, scene);
  postA.position.set(-10, 1.8, -5.2);
  postA.material = logMat;
  postA.parent = frame;

  const postB = postA.clone("post-b");
  postB.position.x = -3.6;
  postB.parent = frame;

  frame.rotation.y = -0.22;

  let pointerX = 0;
  let pointerY = 0;
  window.addEventListener("pointermove", (event) => {
    pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
    pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
  });

  scene.onBeforeRenderObservable.add(() => {
    const time = performance.now() * 0.001;
    river.material.alpha = 0.78 + Math.sin(time * 1.8) * 0.08;
    sun.position.y = 10 + Math.sin(time * 0.42) * 0.28;
    frame.rotation.z = Math.sin(time * 0.8) * 0.018;

    clouds.forEach((cloud, index) => {
      cloud.position.x = Math.sin(time * 0.18 + index) * 0.75;
      cloud.position.y = Math.cos(time * 0.14 + index) * 0.18;
    });

    camera.alpha = Math.PI / 2 + pointerX * 0.035;
    camera.beta = Math.PI / 2.45 + pointerY * 0.018;
  });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());
}

window.addEventListener("DOMContentLoaded", bootSunnyScene);
