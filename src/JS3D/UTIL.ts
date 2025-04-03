import { CACHE } from './CACHE'

// 声明Ikun3D模块，避免类型错误
declare const Ikun3D: any
// 声明STATE对象，解决引用错误
declare const STATE: {
  sceneList: Record<string, any>
}

/**
 * 相机状态接口
 */
interface CameraState {
  position: {
    x: number
    y: number
    z: number
  }
  target: {
    x: number
    y: number
    z: number
  }
}

/**
 * 相机动画参数接口
 */
interface CameraAnimationOptions {
  cameraState: CameraState
  callback?: () => void
  duration?: number
}

/**
 * 世界变换信息接口
 */
interface TransformInfo {
  position: any  // Vector3
  quaternion: any  // Quaternion
  scale: any  // Vector3
}

/**
 * 相机动画 - 使用补间动画平滑移动相机到指定位置和朝向
 * @param options 动画配置选项，包含目标状态、回调和持续时间
 * @returns Tween动画实例，可用于控制动画
 */
function cameraAnimation({ cameraState, callback, duration = 800 }: CameraAnimationOptions) {
  const targetPos = new Ikun3D.Vector3()
  const pos = new Ikun3D.Vector3()
  targetPos.set(cameraState.target.x, cameraState.target.y, cameraState.target.z)
  pos.set(cameraState.position.x, cameraState.position.y, cameraState.position.z)

  // 如果相机已在目标位置，直接调用回调并返回
  if (targetPos.distanceTo(CACHE.container.control.target) < 0.1 && 
      pos.distanceTo(CACHE.container.control.object.position) < 0.1) {
    callback?.()
    return
  }

  // 移动期间禁用控制器
  CACHE.container.control.enabled = false
  // 计数器用于追踪两个动画的完成情况
  let count = 0

  // 创建相机位置动画
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
    .onUpdate(() => { }) // 空的onUpdate保留用于后续可能的扩展
    .onComplete(() => {
      count++
      // 两个动画都完成后再启用控制器并执行回调
      if (count === 2) {
        CACHE.container.control.enabled = true
        callback?.()
      }
    })

  // 创建相机目标点动画
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
    .onUpdate(() => { }) // 空的onUpdate保留用于后续可能的扩展
    .onComplete(() => {
      count++
      // 两个动画都完成后再启用控制器并执行回调
      if (count === 2) {
        CACHE.container.control.enabled = true
        callback?.()
      }
    })

  // 启动动画
  t1.start()
  t2.start()

  return t1
}

/**
 * 单模型实例化 - 将多个相同模型转换为实例化渲染，提高性能
 * @param identicalMeshArray 需要实例化的网格数组
 * @param name 实例化后的名称标识符
 */
function instantiationSingleInfo(identicalMeshArray: any[], name: string) {
  // 确保缓存对象已初始化
  ensureCacheInitialized()
  
  identicalMeshArray.forEach((item) => {
    const instanceName = name
    
    // 初始化当前类型的实例变换信息数组
    if (CACHE.instanceTransformInfo && !CACHE.instanceTransformInfo[instanceName]) {
      CACHE.instanceTransformInfo[instanceName] = []
    }

    // 获取物体的世界变换信息
    const p = new Ikun3D.Vector3()
    const s = new Ikun3D.Vector3()
    const q = new Ikun3D.Quaternion()

    item.getWorldPosition(p)
    item.getWorldScale(s)
    item.getWorldQuaternion(q)

    // 存储变换信息
    if (CACHE.instanceTransformInfo) {
      CACHE.instanceTransformInfo[instanceName].push({
        position: p,
        quaternion: q,
        scale: s,
      })
    }

    // 存储材质和几何体信息（仅存储一次）
    if (CACHE.instanceMeshInfo && !CACHE.instanceMeshInfo[instanceName]) {
      CACHE.instanceMeshInfo[instanceName] = {
        material: item.material.clone(),
        geometry: item.geometry.clone()
      }
    }

    // 添加到待移除列表，后续将移除原始网格以节省内存
    if (CACHE.removed && !CACHE.removed[item.uuid]) {
      CACHE.removed[item.uuid] = item
    }

    // 延迟释放资源，避免阻塞主线程
    setTimeout(() => {
      // 释放几何体和材质资源
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

/**
 * 确保CACHE对象中的实例相关属性已初始化
 */
function ensureCacheInitialized() {
  // 初始化CACHE中的实例相关对象
  if (!CACHE.instanceTransformInfo) {
    CACHE.instanceTransformInfo = {}
  }
  
  if (!CACHE.instanceMeshInfo) {
    CACHE.instanceMeshInfo = {}
  }
  
  if (!CACHE.removed) {
    CACHE.removed = {}
  }
}

/**
 * 实例化生成 - 从缓存中创建实例化网格，提高渲染性能
 */
function instanceInit() {
  // 移除未使用的对象
  if (CACHE.removed) {
    for (const i in CACHE.removed) {
      const removed = CACHE.removed[i]
      if (removed.parent) {
        removed.parent.remove(removed)
      }
    }
  }

  // 生成实例化网格
  if (CACHE.instanceMeshInfo && CACHE.instanceTransformInfo) {
    for (const key in CACHE.instanceMeshInfo) {
      const { geometry, material } = CACHE.instanceMeshInfo[key]
      const count = CACHE.instanceTransformInfo[key]?.length || 0
      
      // 跳过没有实例的对象
      if (count === 0) continue
      
      // 创建实例化网格
      const instanceMesh = new Ikun3D.InstancedMesh(geometry, material, count)
      instanceMesh.castShadow = true
      instanceMesh.receiveShadow = true
      
      // 设置每个实例的变换矩阵
      const matrix = new Ikun3D.Matrix4()
      for (let i = 0; i < count; i++) {
        const { position, quaternion, scale } = CACHE.instanceTransformInfo[key][i]
        matrix.compose(position, quaternion, scale)
        instanceMesh.setMatrixAt(i, matrix)
      }
      
      // 添加到场景列表，用于后续引用
      STATE.sceneList[key] = instanceMesh

      // 特定类型的网格特殊材质处理
      applySpecialMaterialSettings(key, instanceMesh)

      // 添加到场景
      CACHE.container.scene.add(instanceMesh)
    }
  }
}

/**
 * 应用特殊材质设置
 * @param key 实例化网格的标识符
 * @param mesh 实例化网格对象
 */
function applySpecialMaterialSettings(key: string, mesh: any) {
  if (key === 'tree1') {
    mesh.material.aoMapIntensity = 0.5
    mesh.material.color = new Ikun3D.Color(0.9, 1.5, 1.05)
  } else if (key === 'tree2') {
    mesh.material.color = new Ikun3D.Color(0.8, 0.8, 1)
  }
}

/**
 * 计算相机到目标指定长度的位置 - 用于相机聚焦效果
 * @param target 目标位置
 * @param distance 相机到目标的距离
 * @returns 计算出的相机位置向量
 */
function getCameraToTargetPosition(target = new Ikun3D.Vector3(0, 0, 0), distance = 1000) {
  const direction = new Ikun3D.Vector3()
  // 计算方向向量
  direction.subVectors(CACHE.container.camera.position, target)
  direction.normalize()

  // 计算偏移向量
  const offset = direction.clone().multiplyScalar(distance)

  // 计算新位置
  const newPosition = new Ikun3D.Vector3()
  newPosition.addVectors(target, offset)

  return newPosition
}

/**
 * 计算物体的世界坐标、缩放和旋转
 * @param object 要计算的物体
 * @returns 世界变换信息
 */
function getWorldPosition(object: any): TransformInfo {
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

// 导出工具函数集合
const UTIL = {
  cameraAnimation,
  instantiationSingleInfo,
  instanceInit,
  getCameraToTargetPosition,
  getWorldPosition,
}

export { UTIL }
