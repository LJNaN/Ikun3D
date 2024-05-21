class Container {
  domElement = null
  reder = null
  clickObjects = []
  outlineObjects = []
  bloomObjects = []
  scene = null
  camera = null
  control = null
  renderer = null

  mouseEventTimer = null

  constructor(dom) {
    this.checkDom(dom)
    this.initScene()
    this.animate();
    this.resize();
    this.test();
    this.mouseEvent()
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
    const renderer = new Ikun3D.WebGLRenderer();
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

  animate() {
    requestAnimationFrame(this.animate.bind(this))
    this.renderer.render(this.scene, this.camera);
    this.control.update();
  }

  resize() {
    addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio)
    })
  }

  test() {
    const geometry = new Ikun3D.BoxGeometry(1, 1, 1);
    const material = new Ikun3D.MeshLambertMaterial({ color: 0x00ff00 });
    const cube = new Ikun3D.Mesh(geometry, material);
    const cube2 = new Ikun3D.Mesh(geometry, material);
    cube2.position.set(0, 0, 2)
    this.scene.add(cube);
    this.scene.add(cube2);
    this.clickObjects.push(cube)
    this.clickObjects.push(cube2)
    this.camera.position.z = 5;

    const light = new Ikun3D.DirectionalLight({ color: '#FFFFFF' })
    light.position.set(7, 5, 3)
    const light2 = new Ikun3D.AmbientLight({ color: '#FFFFFF' })
    container.scene.add(light)
    container.scene.add(light2)
    cube.castShadow = true
    cube2.castShadow = true
    light.castShadow = true

    this.camera.position.set(4.265633980989674, 2.225126559731919, 3.093133739429277)
    this.control.target.set(0.21223607274690665, 0.023398561398567788, 1.163792085183366)

    const planeG = new Ikun3D.PlaneGeometry(10, 10)
    const planeM = new Ikun3D.MeshLambertMaterial({ color: 0xaaaaaa });
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
    // render()
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


}



Ikun3D.Container = Container