<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { startFx } from './fx'

const canvas = ref(null)
let stop = () => {}
onMounted(() => { stop = startFx(canvas.value) })
onBeforeUnmount(() => stop())
</script>

<template>
  <v-app>
    <canvas ref="canvas" class="fx" aria-hidden="true" />
    <div class="wash w1" /><div class="wash w2" /><div class="wash w3" />

    <nav class="fixed top-0 inset-x-0 z-20 flex justify-center pt-3 pointer-events-none"
         style="padding-top: calc(12px + env(safe-area-inset-top, 0px))">
      <div class="pointer-events-auto flex gap-1 p-1 rounded-full bg-white/70 backdrop-blur shadow-lg shadow-deep/10">
        <v-btn to="/" exact size="small" variant="text" class="nav-btn">Home</v-btn>
        <v-btn to="/album" size="small" variant="text" class="nav-btn">Album</v-btn>
      </div>
    </nav>

    <v-main class="main">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>
  </v-app>
</template>

<style>
.fx { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }
.main { position: relative; z-index: 2; }
.wash { position: fixed; border-radius: 50%; filter: blur(70px); opacity: .55; z-index: 0; pointer-events: none; animation: drift 22s ease-in-out infinite alternate; }
.w1 { width: 60vmax; height: 60vmax; left: -20vmax; top: -18vmax; background: #7fb2f7; }
.w2 { width: 50vmax; height: 50vmax; right: -18vmax; top: 30vh; background: #b48cf2; animation-delay: -8s; }
.w3 { width: 55vmax; height: 55vmax; left: 10vw; bottom: -30vmax; background: #8aa4f5; animation-delay: -14s; }
@keyframes drift { to { transform: translate(6vmax, 4vmax) scale(1.12); } }

.nav-btn { transition: background-color .35s, color .35s !important; }
.nav-btn.v-btn--active { background: #1f4a8a !important; color: #fff !important; }
.nav-btn.v-btn--active .v-btn__overlay { opacity: 0 !important; }
</style>
