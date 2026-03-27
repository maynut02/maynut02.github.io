<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";

import ParticlesBg from "@/components/ParticlesBg.vue";

const supportsFinePointer = ref(true);
const hoveredInteractiveElement = ref<HTMLElement | null>(null);

const cursorState = reactive({
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  width: 28,
  height: 28,
  targetWidth: 28,
  targetHeight: 28,
  radius: 999,
  targetRadius: 999,
  visible: false,
  pressed: false,
  interactive: false,
});

const cursorStyle = computed(() => ({
  transform: `translate3d(${cursorState.x}px, ${cursorState.y}px, 0) translate(-50%, -50%) scale(${cursorState.pressed ? 0.96 : 1})`,
  width: `${cursorState.width}px`,
  height: `${cursorState.height}px`,
  borderRadius: `${cursorState.radius}px`,
  opacity: cursorState.visible ? "1" : "0",
}));

const cursorDotStyle = computed(() => ({
  transform: `translate3d(${cursorState.targetX}px, ${cursorState.targetY}px, 0) translate(-50%, -50%) scale(${cursorState.pressed ? 0.8 : 1})`,
  opacity: cursorState.visible ? "1" : "0",
}));

function updatePointerTarget(clientX: number, clientY: number) {
  cursorState.targetX = clientX;
  cursorState.targetY = clientY;
}

function setTargetAsPointerCircle(interactive: boolean) {
  cursorState.interactive = interactive;
  cursorState.targetWidth = interactive ? 24 : 28;
  cursorState.targetHeight = interactive ? 24 : 28;
  cursorState.targetRadius = 999;
}

function setTargetAsElementRect(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const radius = Number.parseFloat(style.borderTopLeftRadius) || 12;
  const pad = 6;

  cursorState.interactive = true;
  updatePointerTarget(rect.left + rect.width / 2, rect.top + rect.height / 2);
  cursorState.targetWidth = rect.width + pad * 2;
  cursorState.targetHeight = rect.height + pad * 2;
  cursorState.targetRadius = Math.max(12, radius + pad);
}

function getInteractiveElement(target: EventTarget | null) {
  const element = target as HTMLElement | null;

  if (!element) {
    return null;
  }

  return element.closest(
    "[data-cursor-interactive='true'], a, button, [role='button'], [tabindex='0']",
  ) as HTMLElement | null;
}

function handlePointerMove(event: PointerEvent) {
  const interactiveElement = getInteractiveElement(event.target);

  if (interactiveElement) {
    hoveredInteractiveElement.value = interactiveElement;
    setTargetAsElementRect(interactiveElement);
  } else {
    hoveredInteractiveElement.value = null;
    updatePointerTarget(event.clientX, event.clientY);
    setTargetAsPointerCircle(false);
  }

  cursorState.visible = true;
}

function handlePointerDown() {
  cursorState.pressed = true;
}

function handlePointerUp() {
  cursorState.pressed = false;
}

function handlePointerLeave() {
  cursorState.visible = false;
  setTargetAsPointerCircle(false);
  hoveredInteractiveElement.value = null;
}

function handlePointerEnter(event: PointerEvent) {
  cursorState.visible = true;
  updatePointerTarget(event.clientX, event.clientY);
}

let cursorRafId: number | null = null;
let pointerQuery: MediaQueryList | null = null;

function animateCursor() {
  if (hoveredInteractiveElement.value && hoveredInteractiveElement.value.isConnected) {
    setTargetAsElementRect(hoveredInteractiveElement.value);
  }

  cursorState.x += (cursorState.targetX - cursorState.x) * 0.2;
  cursorState.y += (cursorState.targetY - cursorState.y) * 0.2;
  cursorState.width += (cursorState.targetWidth - cursorState.width) * 0.18;
  cursorState.height += (cursorState.targetHeight - cursorState.height) * 0.18;
  cursorState.radius += (cursorState.targetRadius - cursorState.radius) * 0.2;

  cursorRafId = window.requestAnimationFrame(animateCursor);
}

function mountCursor() {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  cursorState.x = centerX;
  cursorState.y = centerY;
  cursorState.targetX = centerX;
  cursorState.targetY = centerY;
  cursorState.width = 28;
  cursorState.height = 28;
  cursorState.targetWidth = 28;
  cursorState.targetHeight = 28;
  cursorState.radius = 999;
  cursorState.targetRadius = 999;
  cursorState.interactive = false;

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointerleave", handlePointerLeave);
  window.addEventListener("pointerenter", handlePointerEnter);

  if (cursorRafId === null) {
    cursorRafId = window.requestAnimationFrame(animateCursor);
  }
}

function unmountCursor() {
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerdown", handlePointerDown);
  window.removeEventListener("pointerup", handlePointerUp);
  window.removeEventListener("pointerleave", handlePointerLeave);
  window.removeEventListener("pointerenter", handlePointerEnter);

  if (cursorRafId !== null) {
    window.cancelAnimationFrame(cursorRafId);
    cursorRafId = null;
  }

  cursorState.visible = false;
  setTargetAsPointerCircle(false);
  hoveredInteractiveElement.value = null;
}

function handlePointerModeChange(event: MediaQueryListEvent) {
  supportsFinePointer.value = event.matches;

  if (event.matches) {
    mountCursor();
    return;
  }

  unmountCursor();
}

onMounted(() => {
  pointerQuery = window.matchMedia("(pointer: fine)");
  supportsFinePointer.value = pointerQuery.matches;

  if (supportsFinePointer.value) {
    mountCursor();
  }

  if (pointerQuery.addEventListener) {
    pointerQuery.addEventListener("change", handlePointerModeChange);
  } else {
    pointerQuery.addListener(handlePointerModeChange);
  }
});

onBeforeUnmount(() => {
  unmountCursor();

  if (!pointerQuery) {
    return;
  }

  if (pointerQuery.removeEventListener) {
    pointerQuery.removeEventListener("change", handlePointerModeChange);
  } else {
    pointerQuery.removeListener(handlePointerModeChange);
  }
});
</script>

<template>
  <main class="relative h-svh w-full overflow-hidden bg-background">
    <ParticlesBg class="absolute inset-0" color="#FFFFFF" :quantity="110" :ease="90" :staticity="14" />

    <div v-if="supportsFinePointer" class="pointer-events-none fixed inset-0 z-[120]">
      <div
        :class="['smooth-cursor-shell', { 'smooth-cursor-shell--interactive': cursorState.interactive }]"
        :style="cursorStyle"
      />
      <div
        :class="['smooth-cursor-dot', { 'smooth-cursor-dot--interactive': cursorState.interactive }]"
        :style="cursorDotStyle"
      />
    </div>
  </main>
</template>
