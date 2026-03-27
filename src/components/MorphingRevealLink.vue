<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";

interface Props {
  href: string;
  texts: string[];
  target?: string;
  rel?: string;
  class?: string;
  enableNavigateReveal?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  target: "_self",
  enableNavigateReveal: true,
});

const linkRef = ref<HTMLAnchorElement | null>(null);
const isHovered = ref(false);
const isTouchArmed = ref(false);
const isNavigating = ref(false);
const navigationOverlayStyle = ref<Record<string, string>>({});
const displayText = ref("");
const isTextVisible = ref(true);

let navigateTimeoutId = 0;
let textSwapTimeoutId = 0;

const NAV_REVEAL_DURATION_MS = 520;
const TEXT_FADE_DURATION_MS = 300;

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

function getTargetText() {
  if (props.texts.length === 0) return "";
  if (props.texts.length === 1) return props.texts[0];
  return isHovered.value ? props.texts[1] : props.texts[0];
}

function syncTextImmediately() {
  window.clearTimeout(textSwapTimeoutId);
  displayText.value = getTargetText();
  isTextVisible.value = true;
}

function animateTextSwap() {
  const nextText = getTargetText();
  window.clearTimeout(textSwapTimeoutId);

  if (!displayText.value) {
    displayText.value = nextText;
    isTextVisible.value = true;
    return;
  }

  isTextVisible.value = false;
  textSwapTimeoutId = window.setTimeout(() => {
    displayText.value = nextText;
    isTextVisible.value = true;
  }, TEXT_FADE_DURATION_MS);
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

function handleLinkPointerDown() {
  if (!isTouchDevice()) return;
  if (isTouchArmed.value) return;

  // Start visual feedback immediately on touch devices (before click fires).
  isHovered.value = true;
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!isTouchArmed.value || !isTouchDevice()) return;

  const target = event.target as Node | null;
  if (target && linkRef.value?.contains(target)) return;

  resetTouchState();
}

onMounted(() => {
  syncTextImmediately();
  window.addEventListener("pointerdown", handleDocumentPointerDown, true);
  window.addEventListener("pageshow", handlePageShow);
});

onUnmounted(() => {
  resetNavigationState();
  window.clearTimeout(textSwapTimeoutId);
  window.removeEventListener("pointerdown", handleDocumentPointerDown, true);
  window.removeEventListener("pageshow", handlePageShow);
});

watch(
  () => isHovered.value,
  () => {
    animateTextSwap();
  },
);

watch(
  () => props.texts,
  () => {
    syncTextImmediately();
  },
  { deep: true },
);
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
    @pointerdown="handleLinkPointerDown"
    @click="handleLinkClick"
  >
    <span
      aria-hidden="true"
      :class="[
        'absolute bottom-0 top-0 bg-foreground py-1 transition-[left,width] duration-500 ease-out',
        isHovered ? 'left-0 w-full' : 'left-1/2 w-0',
      ]"
    />
    <span
      :class="[
        'relative z-10 flex h-full justify-center items-center py-1 transition-colors duration-500',
        isHovered ? 'text-background' : '',
      ]"
    >
      <span
        class="inline-flex w-full items-center justify-center transition-opacity duration-300"
        :class="isTextVisible ? 'opacity-100' : 'opacity-0'"
      >
        {{ displayText }}
      </span>
    </span>
  </a>

  <span
    v-if="isNavigating"
    class="pointer-events-none fixed inset-x-0 z-120 bg-foreground transition-[top,bottom] duration-500 ease-in-out"
    :style="navigationOverlayStyle"
  />
</template>
