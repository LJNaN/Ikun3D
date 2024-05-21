<template>
  <div id="sceneContainer"></div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

onMounted(() => {
  const container = new Ikun3D.Container('sceneContainer')
  container.importModel({
    url: ['/assets/1.glb'],
    onProgress: (model) => {
      console.log(model)
      if (model.name === 'Scene') {
        model.position.set(-2, -0.75, -2)
        model.traverse(e => {
          if(e.isMesh) {
            container.clickObjects.push(e)
          }
        })
      }
    },
    onLoad: () => {
      console.log('加载完毕')
    }
  })
  container.dbClick = (e) => {
    console.log(e)
  }
})
</script>

<style scoped lang="less"></style>