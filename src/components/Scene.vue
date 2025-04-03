<template>
  <div id="sceneContainer"></div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {UTIL} from '@/JS3D/UTIL'

onMounted(() => {
  const container = new Ikun3D.Container('sceneContainer')
  container.setSkyBox('/assets/5.jpg')
  container.importModel({
    url: ['/assets/1.glb'],
    // url: [],
    onProgress: (model) => {
      if (model.name === 'Scene') {
        model.position.set(-2051, -200, -3017)
        model.scale.set(1000, 1000, 1000)
        model.traverse(e => {
          if (e.isMesh) {
            e.castShadow = true
            container.clickObjects.push(e)

            if (e.name === 'GroundPlane_Plane_0') {
              e.visible = false

            } else {
              e.receiveShadow = true
            }
          }
        })
      }
    },
    onLoad: () => {
      console.log('加载完毕')
      container.test()
    }
  })
  container.dbClick = (e) => {
    console.log(e)
  }


})
</script>

<style scoped lang="less"></style>