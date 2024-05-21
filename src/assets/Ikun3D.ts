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

  constructor(dom) {
    this.checkDom(dom)
    this.initScene()
    this.animate();
    this.resize();
    this.test();
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
    const material = new Ikun3D.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new Ikun3D.Mesh(geometry, material);
    this.scene.add(cube);
    this.camera.position.z = 5;

    function render() {
      requestAnimationFrame(render)
      cube.rotation.x += 0.01
      cube.rotation.z += 0.01
    }
    // render()
  }

  mouse() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    this.renderer.domElement.addEventListener("mousedown", (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(this.clickObjects, true);
      if (intersects.length > 0) {
        const obj = intersects[0].object;
        obj.material.color.set("#ff0000");
        obj.material.needsUpdate = true;
      }
    })
  }
}



Ikun3D.Container = Container