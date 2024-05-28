function initBloomPass(container) {
  // ********* 辉光start *********
  const BLOOM_LAYER = 1;
  const bloomLayer = new Ikun3D.Layers();
  bloomLayer.set(BLOOM_LAYER);

  const bloomComposer = new Ikun3D.EffectComposer(container.renderer);
  bloomComposer.renderToScreen = false; // 不渲染到屏幕上
  bloomComposer.addPass(container.renderPass);
  container.bloomComposer = bloomComposer

  const darkMaterial = new Ikun3D.MeshBasicMaterial({ color: "black" });
  const materials = {};

  function darkenNonBloomed(obj) {
    if (obj.isMesh && (!container.bloomObjects.includes(obj))) {
      materials[obj.uuid] = obj.material;
      obj.material = darkMaterial;
    }
  }
  container.darkenNonBloomed = darkenNonBloomed


  const bloomPass = new Ikun3D.UnrealBloomPass(
    new Ikun3D.Vector2(container.renderer.domElement.innerWidth, container.renderer.domElement.innerHeight),
    0.8,
    0.8,
    0.1,
  );
  bloomComposer.addPass(bloomPass);
  container.bloomPass = bloomPass

  function restoreMaterial(obj) {
    if (materials[obj.uuid]) {
      obj.material = materials[obj.uuid];
      delete materials[obj.uuid];
    }
  }
  container.restoreMaterial = restoreMaterial

  const vs = `
   varying vec2 vUv;
   void main() {
     vUv = uv;
     gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
   }
 `

  const fs = `
   uniform sampler2D baseTexture;
   uniform sampler2D bloomTexture;
   varying vec2 vUv;
   void main() {
     gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
   }
 `

  const shaderPass = new Ikun3D.ShaderPass(
    new Ikun3D.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture },
      },
      vertexShader: vs,
      fragmentShader: fs,
      defines: {},
    }),
    'baseTexture',
  );
  shaderPass.needsSwap = true;
  shaderPass.name = 'bloomShaderPass'
  container.composer.addPass(shaderPass);


  const gui = new dat.GUI();
  gui.add(container.bloomPass, 'enabled').name('辉光开启');
  gui.add(container.bloomPass, 'strength', 0, 2).name('强度');
  gui.add(container.bloomPass, 'radius', 0, 2).name('半径');
  gui.add(container.bloomPass, 'threshold', 0, 2).name('阈值');
  container.bloomGUI = gui
  // ********* 辉光end *********
}

function initOutlinePass(container) {
  const composer = container.composer
  const outlinePass = new Ikun3D.OutlinePass(new Ikun3D.Vector2(window.innerWidth, window.innerHeight), container.scene, container.camera);
  outlinePass.selectedObjects = container.outlineObjects
  container.outlinePass = outlinePass
  composer.addPass(outlinePass);

  const gui = new dat.GUI();
  gui.add(container.outlinePass, 'enabled').name('轮廓线开启');
  const edgeColor = {
    visible: '#' + container.outlinePass.visibleEdgeColor.getHexString(),
    hidden: '#' + container.outlinePass.hiddenEdgeColor.getHexString()
  }
  gui.addColor(edgeColor, 'visible').name('可见部分颜色').onChange(val => {
    container.outlinePass.visibleEdgeColor.set(val)
  })
  gui.addColor(edgeColor, 'hidden').name('遮挡部分颜色').onChange(val => {
    container.outlinePass.hiddenEdgeColor.set(val)
  })
  gui.add(container.outlinePass, 'edgeStrength', 0, 10).name('亮度');
  gui.add(container.outlinePass, 'edgeGlow', 0, 1).name('光晕');
  gui.add(container.outlinePass, 'edgeThickness', 0.1, 5).name('边缘透明度');
  gui.add(container.outlinePass, 'pulsePeriod', 0, 5).name('呼吸灯');
  container.outlineGUI = gui
}

function initRGBPass(container) {
  const shaderPass = new Ikun3D.ShaderPass(
    new Ikun3D.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: container.composer },
        color: { value: new Ikun3D.Color(0xffffff) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform vec3 color;
        void main() {
          vec4 previousPassColor = texture2D(tDiffuse, vUv);
          gl_FragColor = vec4(
              previousPassColor.rgb * color,
              previousPassColor.a);
        }
      `,
    })
  );
  shaderPass.name = 'RGBPass'
  container.composer.addPass(shaderPass);
  container.RGBPass = shaderPass

  const gui = new dat.GUI();
  gui.add(container.RGBPass, 'enabled').name('RGB调整开启');
  gui.add(container.RGBPass.material.uniforms.color.value, 'r', 0, 2).name('红');
  gui.add(container.RGBPass.material.uniforms.color.value, 'g', 0, 2).name('绿');
  gui.add(container.RGBPass.material.uniforms.color.value, 'b', 0, 2).name('蓝');
}

function initFXAA(container) {
  const fxaaPass = new Ikun3D.ShaderPass(Ikun3D.FXAAShader)
  fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight)
  container.composer.addPass(fxaaPass)
}

class Container {
  domElement = null
  clickObjects = []
  outlineObjects = []
  bloomObjects = []
  scene = null
  camera = null
  control = null
  transformControl = null
  renderer = null
  clock = new Ikun3D.Clock()
  background = null

  renderPass = null
  composer = null


  // ***** 辉光Pass start*****
  _bloomEnabled = true
  bloomPass = null
  restoreMaterial = null
  darkenNonBloomed = null
  bloomComposer = null
  bloomGUI = null
  get bloomEnabled() {
    return this._bloomEnabled
  }
  set bloomEnabled(val) {
    this.bloomPass.enabled = val
    this._bloomEnabled = val
    this.composer.passes.find(e => e?.name === 'bloomShaderPass').enabled = val
  }
  // ***** 辉光Pass end*****


  // ***** outlinePass start *****
  _outlineEnabled = true
  outlinePass = null
  outlineGUI = null
  get outlineEnabled() {
    return this._outlineEnabled
  }
  set outlineEnabled(val) {
    this.outlinePass.enabled = val
    this._outlineEnabled = val
  }
  // ***** outlinePass end *****


  // ***** RGBPass start *****
  _RGBEnabled = true
  RGBPass = null
  get RGBEnabled() {
    return this._RGBEnabled
  }
  set RGBEnabled(val) {
    this.RGBPass.enabled = val
    this._RGBEnabled = val
  }
  // ***** RGBPass end *****


  mouseEventTimer = null

  directionalLight = null
  directionalLightHelper = null
  ambientLight = null

  constructor(dom) {
    this.checkDom(dom)
    this.initScene()
    this.initLight()
    this.initDefaultSkyBox()
    this.resize()
    this.mouseEvent()
    this.initPass()
    this.test()
    this.animate()

    // 后续加载
    this.initTransformControl()
  }

  checkDom(dom) {
    if (dom instanceof HTMLElement) {
      this.domElement = dom

    } else if (typeof dom === 'string') {
      const d = document.getElementById(dom)
      if (d) {
        this.domElement = d
      } else {
        console
          .error('未找到 dom 元素')
        return
      }

    } else {
      console
        .error('未找到 dom 元素')
      return
    }

    if (Ikun3D.container instanceof Array) {
      Ikun3D.container.push(this)
    } else {
      Ikun3D.container = [this]
    }
    window.container = this
  }

  initScene() {
    const scene = new Ikun3D.Scene();
    const camera = new Ikun3D.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
    const renderer = new Ikun3D.WebGLRenderer({ logarithmicDepthBuffer: true });
    const control = new Ikun3D.OrbitControls(camera, renderer.domElement);
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.control = control

    renderer.setSize(window.innerWidth, window.innerHeight);
    this.domElement.appendChild(renderer.domElement);

    control.update();
    renderer.shadowMap.enabled = true
  }

  initLight() {
    const directionalLight = new Ikun3D.DirectionalLight({ color: '#FFFFFF' })
    this.directionalLight = directionalLight
    directionalLight.position.set(7, 5, 3)
    directionalLight.castShadow = true

    const ambientLight = new Ikun3D.AmbientLight({ color: '#FFFFFF' })
    this.ambientLight = ambientLight
    ambientLight.intensity = 1.5

    this.scene.add(directionalLight)
    this.scene.add(ambientLight)

    const helper = new Ikun3D.DirectionalLightHelper(directionalLight, 5)
    this.directionalLightHelper = helper
    this.scene.add(helper)


    setTimeout(() => {
      this.transformControl.attach(directionalLight)
    }, 0)
  }

  animate() {
    this.control.update();

    if (this.bloomEnabled) {
      this.scene.traverse(this.darkenNonBloomed)
      this.bloomComposer.render()
      this.scene.traverse(this.restoreMaterial)
    }
    this.composer.render()



    requestAnimationFrame(this.animate.bind(this))
  }

  resize() {
    addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio)
    })
  }

  initPass() {
    const renderPass = new Ikun3D.RenderPass(this.scene, this.camera)
    this.renderPass = renderPass

    const composer = new Ikun3D.EffectComposer(this.renderer);
    composer.addPass(this.renderPass);
    this.composer = composer

    initBloomPass(this)
    initOutlinePass(this)
    initRGBPass(this)
    initFXAA(this)
  }

  test() {
    const geometry = new Ikun3D.BoxGeometry(1000, 1000, 1000);
    const material = new Ikun3D.MeshLambertMaterial({ color: 0x00ff00 });
    const cube = new Ikun3D.Mesh(geometry, material);
    const cube2 = new Ikun3D.Mesh(geometry, material);
    cube.name = 'cube'
    window.cube = cube
    this.bloomObjects.push(cube)
    this.outlineObjects.push(cube)

    cube2.name = 'cube2'
    cube2.position.set(0, 0, 2)
    this.scene.add(cube);
    this.scene.add(cube2);
    this.clickObjects.push(cube)
    this.clickObjects.push(cube2)
    this.camera.position.z = 5;

    cube.castShadow = true
    cube2.castShadow = true
    this.camera.position.set(2427.62362025659, 6219.270630105399, 3848.267891750872)
    this.control.target.set(0, 0, 0)

    const planeG = new Ikun3D.PlaneGeometry(10000, 10000)
    const planeM = new Ikun3D.MeshLambertMaterial({ color: 0xffffff });
    const plane = new Ikun3D.Mesh(planeG, planeM)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -0.5
    container.scene.add(plane)
    plane.receiveShadow = true


    function render() {
      requestAnimationFrame(render)
      cube.rotation.x += 0.01
      cube.rotation.z += 0.01
    }
    render()


  }

  importModel(option: Object) {
    const { url, onProgress, onLoad } = option
    if (!(url instanceof Array)) {
      console
        .error('要传 url 数组')
      return
    }

    url.forEach((u, index) => {
      const loader = new Ikun3D.GLTFLoader()
      const dracoLoader = new Ikun3D.DRACOLoader()
      dracoLoader.setDecoderPath('/assets/draco/')
      dracoLoader.preload()
      loader.setDRACOLoader(dracoLoader)
      loader.load(u, (gltf) => {
        this.scene.add(gltf.scene)
        onProgress(gltf.scene)

        if (index === (url.length - 1)) {
          onLoad()
        }
      })
    })
  }

  initDefaultSkyBox() {
    const geometry = new Ikun3D.SphereGeometry(32000, 32, 32);
    const material = new Ikun3D.MeshBasicMaterial({ color: 0xffffff });
    material.side = 1
    material.needsUpdate = true
    const sphere = new Ikun3D.Mesh(geometry, material);
    sphere.name = 'skyBox'
    this.scene.add(sphere);
  }

  setSkyBox(url: Array | String) {
    const this_ = this
    if (url instanceof Array) {
      const loader = new Ikun3D.TextureLoader()
      this.scene.background = loader.load(url)
      this.background = this.scene.background.clone()

    } else if (typeof (url) === 'string') {
      const loader = new Ikun3D.TextureLoader()
      const texture = loader.load(url, () => {
        this_.background = texture
        const bgMesh = this_.scene.children.find(e => e.name === 'skyBox')

        if (bgMesh) {
          bgMesh.material.map = texture
          bgMesh.material.needsUpdate = true
        }
      })

    } else {
      console
        .error('类型错误，只能传6个面的url数组或1张全景图url')
    }
  }

  mouseEvent() {
    const this_ = this
    const raycaster = new Ikun3D.Raycaster();
    const mouse = new Ikun3D.Vector2();

    function getObjects(event) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, this_.camera);
      const intersects = raycaster.intersectObjects(this_.clickObjects, true);
      return intersects
    }

    this.renderer.domElement.addEventListener("mousemove", (event) => {
      this.hover(getObjects(event))
    })


    let clickTimes = 0
    this.renderer.domElement.addEventListener("mousedown", (event) => {
      if (this.mouseEventTimer) {
        clearTimeout(this.mouseEventTimer)
      }

      clickTimes++
      if (clickTimes >= 2) {
        this.dbClick(getObjects(event))
        clickTimes = 0
        return
      }

      this.mouseEventTimer = setTimeout(() => {
        if (clickTimes >= 2) {
          this.dbClick(getObjects(event))

        } else {
          this.click(getObjects(event))
        }

        clickTimes = 0
        clearTimeout(this.mouseEventTimer)
      }, 300)
    })


  }

  click() { }
  hover() { }
  dbClick() { }

  initTransformControl() {
    const this_ = this
    const transformControl = new Ikun3D.TransformControls(this.camera, this.renderer.domElement)
    this.transformControl = transformControl
    this.scene.add(transformControl)
    transformControl.addEventListener('dragging-changed', function (event) {
      this_.control.enabled = !event.value

    });

    transformControl.addEventListener('change', function (event) {
      if (this_?.directionalLightHelper?.visible) {
        this_.directionalLightHelper.update()
      }
    })
  }
}



Ikun3D.Container = Container