<template>
  <div class="main">
    <!-- <Home class="home"></Home> -->
    <Scene class="scene"></Scene>
  </div>
</template>

<script setup lang="ts">
import Home from './pages/Home.vue'
import Scene from '@/components/Scene.vue'
import { onMounted } from 'vue'

onMounted(() => {
  const container = new Ikun3D.Container('sceneContainer')
})
</script>

<style scoped lang="less">
.main {
  position: absolute;
  width: 100vw;
  height: 100vh;
  overflow: hidden;

  .home {
    position: absolute;
    width: 100%;
    height: 100%;
  }

  .scene {
    position: absolute;
    width: 100%;
    height: 100%;
  }
}
</style>
