import { CACHE } from './CACHE'

// 相机动画（传指定state）
function cameraAnimation({ cameraState, callback, duration = 800 }) {
  const targetPos = new Ikun3D.Vector3()
  const pos = new Ikun3D.Vector3()
  targetPos.set(cameraState.target.x, cameraState.target.y, cameraState.target.z)
  pos.set(cameraState.position.x, cameraState.position.y, cameraState.position.z)

  if (targetPos.distanceTo(CACHE.container.control.target) < 0.1 && pos.distanceTo(CACHE.container.control.object.position) < 0.1) {
    callback && callback()
    return
  }

  CACHE.container.control.enabled = false
  let count = 0

  const t1 = new Ikun3D.TWEEN.Tween(CACHE.container.camera.position)
    .to(
      {
        x: cameraState.position.x,
        y: cameraState.position.y,
        z: cameraState.position.z
      },
      duration
    )
    .easing(Ikun3D.TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => { })
    .onComplete(() => {
      count++

      if (count == 2) {
        CACHE.container.control.enabled = true
        callback && callback()
      }
    })


  const t2 = new Ikun3D.TWEEN.Tween(CACHE.container.control.target)
    .to(
      {
        x: cameraState.target.x,
        y: cameraState.target.y,
        z: cameraState.target.z
      },
      duration
    )
    .easing(Ikun3D.TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => { })
    .onComplete(() => {
      count++
      if (count == 2) {
        CACHE.container.control.enabled = true
        callback && callback()
      }
    })

  t1.start()
  t2.start()

  return t1
}

// 单模型实例化
function instantiationSingleInfo(identicalMeshArray, name) {
  identicalMeshArray.forEach((item) => {
    const instanceName = name
    if (!CACHE.instanceTransformInfo[instanceName]) {
      CACHE.instanceTransformInfo[instanceName] = []
    }

    let p = new Ikun3D.Vector3()
    let s = new Ikun3D.Vector3()
    let q = new Ikun3D.Quaternion()


    item.getWorldPosition(p)
    item.getWorldScale(s)
    item.getWorldQuaternion(q)

    CACHE.instanceTransformInfo[instanceName].push({
      position: p,
      quaternion: q,
      scale: s,
    })

    if (!CACHE.instanceMeshInfo[instanceName]) {
      CACHE.instanceMeshInfo[instanceName] = {
        material: item.material.clone(),
        geometry: item.geometry.clone()
      }
    }

    if (!CACHE.removed[item.uuid]) CACHE.removed[item.uuid] = item;


    setTimeout(() => {
      item.geometry.dispose()
      if (item.material.map) {
        item.material.map.dispose()
        item.material.map = null
      }
      item.material.dispose()
      item = null
    }, 0)
  })
}

// 实例化生成
function instanceInit() {
  // remove unused obj3d
  for (const i in CACHE.removed) {
    const removed = CACHE.removed[i];
    if (removed.parent) {
      removed.parent.remove(removed);
    }
  }

  // instance
  for (const key in CACHE.instanceMeshInfo) {
    const { geometry, material } = CACHE.instanceMeshInfo[key];
    const count = CACHE.instanceTransformInfo[key].length;
    const instanceMesh = new Ikun3D.InstancedMesh(geometry, material, count);
    instanceMesh.castShadow = true
    instanceMesh.receiveShadow = true
    const matrix = new Ikun3D.Matrix4();
    for (let i = 0; i < count; i++) {
      const { position, quaternion, scale } = CACHE.instanceTransformInfo[key][i]
      matrix.compose(position, quaternion, scale)
      instanceMesh.setMatrixAt(i, matrix)
    }
    STATE.sceneList[key] = instanceMesh

    if (key === 'tree1') {
      instanceMesh.material.aoMapIntensity = 0.5
      instanceMesh.material.color = new Ikun3D.Color(0.9, 1.5, 1.05)

    } else if (key === 'tree2') {
      instanceMesh.material.color = new Ikun3D.Color(0.8, 0.8, 1)

    }

    CACHE.container.scene.add(instanceMesh)
  }
}

// 计算相机到目标指定长度的位置
function getCameraToTargetPosition(target = new Ikun3D.Vector3(0, 0, 0), distance = 1000) {
  const direction = new Ikun3D.Vector3()
  direction.subVectors(CACHE.container.camera.position, target)
  direction.normalize()

  const offset = direction.clone().multiplyScalar(distance)

  const newPosition = new Ikun3D.Vector3()
  newPosition.addVectors(target, offset)

  return newPosition
}

// 计算世界坐标
function getWorldPosition(object) {
  const worldP = new Ikun3D.Vector3()
  const worldS = new Ikun3D.Vector3()
  const worldQ = new Ikun3D.Quaternion()

  object.getWorldPosition(worldP)
  object.getWorldScale(worldS)
  object.getWorldQuaternion(worldQ)

  return {
    position: worldP,
    scale: worldS,
    quaternion: worldQ
  }
}

export const UTIL = {
  cameraAnimation,
  instantiationSingleInfo,
  instanceInit,
  getCameraToTargetPosition,
  getWorldPosition,
}

window.UTIL = UTIL