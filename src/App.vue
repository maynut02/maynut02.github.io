<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import MorphingRevealLink from "./components/MorphingRevealLink.vue";
import RadiantText from "./components/RadiantText.vue";
import SmoothCursor from "./components/SmoothCursor.vue";

const links = [
  {
    href: "https://www.youtube.com/@MayNut",
    texts: ["메이넛 유튜브 채널", "youtube.com/@MayNut"],
  },
  {
    href: "https://discord.gg/7pNGhZcCQH",
    texts: ["신작탐험대 디스코드 서버", "discord.gg/7pNGhZcCQH"],
  },
  {
    href: "https://astral.maynutlab.com",
    texts: ["아스트랄 파티 한글패치", "astral.maynutlab.com"],
  },
  {
    href: "https://arkchess.maynutlab.com",
    texts: ["위수 협의: 맹약/하반기 도감", "arkchess.maynutlab.com"],
  },
  {
    href: "https://thumbnail.maynutlab.com",
    texts: ["유튜브 썸네일 메이커", "thumbnail.maynutlab.com"],
  },
  {
    href: "mailto:connect@maynutlab.com",
    texts: ["Connect", "connect@maynutlab.com"],
    enableNavigateReveal: false,
  },
];

const LOADING_TEXT_HIDE_DELAY_MS = 1000;
const LOADING_OVERLAY_LEAVE_DELAY_MS = 2000;
const LOADING_OVERLAY_REMOVE_DELAY_MS = 3000;

const showLoadingOverlay = ref(true);
const showLoadingText = ref(true);
const isOverlayLeaving = ref(false);
const timeoutIds: number[] = [];

function queueTimeout(callback: () => void, delay: number) {
  const timeoutId = window.setTimeout(callback, delay);
  timeoutIds.push(timeoutId);
}

function clearAllTimeouts() {
  for (const timeoutId of timeoutIds) {
    window.clearTimeout(timeoutId);
  }
  timeoutIds.length = 0;
}

const handleWindowLoad = () => {
  clearAllTimeouts();

  queueTimeout(() => {
    showLoadingText.value = false;
  }, LOADING_TEXT_HIDE_DELAY_MS);

  queueTimeout(() => {
    isOverlayLeaving.value = true;
  }, LOADING_OVERLAY_LEAVE_DELAY_MS);

  queueTimeout(() => {
    showLoadingOverlay.value = false;
  }, LOADING_OVERLAY_REMOVE_DELAY_MS);
};

onMounted(() => {
  if (document.readyState === "complete") {
    handleWindowLoad();
    return;
  }

  window.addEventListener("load", handleWindowLoad, { once: true });
});

onUnmounted(() => {
  window.removeEventListener("load", handleWindowLoad);
  clearAllTimeouts();
});
</script>

<template>
  <main class="flex flex-col min-h-svh w-full pt-20">
    <div class="relative flex flex-1 items-center justify-center rounded-4xl">
      <div class="flex w-full flex-col text-center text-2xl md:text-4xl">
        <MorphingRevealLink
          v-for="item in links"
          :key="item.href"
          :href="item.href"
          :texts="item.texts"
          :enable-navigate-reveal="item.enableNavigateReveal ?? true"
        />
      </div>
    </div>

    <div class="flex justify-center pb-4 pt-20">
      <span class="text-neutral-600 text-xs">Copyright 2026. MayNut All rights reserved.</span>
    </div>
  </main>

  <div
    v-if="showLoadingOverlay"
    :class="[
      'fixed inset-0 z-10 flex items-center justify-center bg-background transition-all duration-700 ease-out',
      isOverlayLeaving ? 'opacity-0 blur-sm' : 'opacity-100 blur-0',
    ]"
  >
    <Transition name="loading-text">
      <RadiantText
        v-if="showLoadingText"
        class="inline-flex items-center justify-center px-4 py-1 transition ease-out"
        :duration="5"
      >
        <span class="pointer-events-none text-3xl">MayNut</span>
      </RadiantText>
    </Transition>
  </div>

  <SmoothCursor />
</template>

<style scoped>
.loading-text-enter-active,
.loading-text-leave-active {
  transition: opacity 0.8s ease, transform 0.8s ease, filter 0.8s ease;
}

.loading-text-enter-from,
.loading-text-leave-to {
  opacity: 0;
  transform: scale(0.98);
  filter: blur(4px);
}

.loading-text-enter-to,
.loading-text-leave-from {
  opacity: 1;
  transform: scale(1);
  filter: blur(0);
}
</style>
