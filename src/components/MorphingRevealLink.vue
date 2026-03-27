<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import MorphingText from "./MorphingText.vue";

interface Props {
  href: string;
  texts: string[];
  target?: string;
  rel?: string;
  class?: string;
  morphTime?: number;
  enableNavigateReveal?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  target: "_self",
  morphTime: 0.65,
  enableNavigateReveal: true,
});

const linkRef = ref<HTMLAnchorElement | null>(null);
const isHovered = ref(false);
const isTouchArmed = ref(false);
const isNavigating = ref(false);
const navigationOverlayStyle = ref<Record<string, string>>({});

let navigateTimeoutId = 0;

const NAV_REVEAL_DURATION_MS = 520;

function isTouchDevice() {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function resetTouchState() {
  isTouchArmed.value = false;
  isHovered.value = false;
}

function resetNavigationState() {
  isNavigating.value = false;
  navigationOverlayStyle.value = {};
  window.clearTimeout(navigateTimeoutId);
}

function shouldBypassCustomNavigation(event: MouseEvent) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function triggerRevealAndNavigate(event: MouseEvent, anchor: HTMLAnchorElement) {
  if (!props.enableNavigateReveal) {
    resetTouchState();
    resetNavigationState();
    anchor.blur();
    return;
  }

  if (isNavigating.value || shouldBypassCustomNavigation(event)) return;

  event.preventDefault();
  resetTouchState();
  anchor.blur();

  const rect = anchor.getBoundingClientRect();
  navigationOverlayStyle.value = {
    top: `${rect.top}px`,
    bottom: `${window.innerHeight - rect.bottom}px`,
  };
  isNavigating.value = true;

  requestAnimationFrame(() => {
    navigationOverlayStyle.value = {
      top: "0px",
      bottom: "0px",
    };
  });

  window.clearTimeout(navigateTimeoutId);
  navigateTimeoutId = window.setTimeout(() => {
    window.location.assign(anchor.href);
  }, NAV_REVEAL_DURATION_MS);
}

function handlePageShow() {
  // Covers bfcache restore and normal page show after browser back/forward.
  resetNavigationState();
  resetTouchState();
}

function handleLinkClick(event: MouseEvent) {
  const anchor = event.currentTarget as HTMLAnchorElement | null;
  if (!anchor) return;

  if (!isTouchDevice()) {
    triggerRevealAndNavigate(event, anchor);
    return;
  }

  if (!isTouchArmed.value) {
    event.preventDefault();
    isTouchArmed.value = true;
    isHovered.value = true;
    return;
  }

  triggerRevealAndNavigate(event, anchor);
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!isTouchArmed.value || !isTouchDevice()) return;

  const target = event.target as Node | null;
  if (target && linkRef.value?.contains(target)) return;

  resetTouchState();
}

onMounted(() => {
  window.addEventListener("pointerdown", handleDocumentPointerDown, true);
  window.addEventListener("pageshow", handlePageShow);
});

onUnmounted(() => {
  resetNavigationState();
  window.removeEventListener("pointerdown", handleDocumentPointerDown, true);
  window.removeEventListener("pageshow", handlePageShow);
});
</script>

<template>
  <a
    ref="linkRef"
    :href="props.href"
    :target="props.target"
    :rel="props.rel ?? (props.target === '_blank' ? 'noopener noreferrer' : undefined)"
    :class="['group relative h-14 overflow-hidden py-1 md:h-18', props.class]"
    @mouseenter="isHovered = true"
    @mouseleave="!isTouchArmed && (isHovered = false)"
    @focusin="isHovered = true"
    @focusout="!isTouchArmed && (isHovered = false)"
    @click="handleLinkClick"
  >
    <span
      aria-hidden="true"
      class="absolute inset-0 bg-foreground py-1 origin-center scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100 group-focus-within:scale-x-100"
    />
    <span class="relative z-10 flex h-full items-center py-1 transition-colors duration-500 group-hover:text-background group-focus-within:text-background">
      <MorphingText class="py-1" :texts="props.texts" :active="isHovered" :morph-time="props.morphTime" />
    </span>
  </a>

  <span
    v-if="isNavigating"
    class="pointer-events-none fixed inset-x-0 z-120 bg-foreground transition-[top,bottom] duration-500 ease-in-out"
    :style="navigationOverlayStyle"
  />
</template>
