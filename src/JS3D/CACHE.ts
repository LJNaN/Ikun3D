let container: any = null

// 扩展CACHE类型，添加所需属性
interface CacheType {
  container: any
  instanceTransformInfo?: Record<string, any[]>
  instanceMeshInfo?: Record<string, { material: any; geometry: any }>
  removed?: Record<string, any>
}

const CACHE: CacheType = {
  container
}

export { CACHE }
