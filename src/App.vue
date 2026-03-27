<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";

import Carousel3D from "@/components/Carousel3D.vue";

const supportsFinePointer = ref(true);
const outlinedInteractiveElement = ref<HTMLElement | null>(null);

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

function setOutlinedElement(element: HTMLElement | null) {
  if (outlinedInteractiveElement.value === element) {
    return;
  }

  if (outlinedInteractiveElement.value && outlinedInteractiveElement.value.isConnected) {
    outlinedInteractiveElement.value.classList.remove("cursor-outline-active");
  }

  outlinedInteractiveElement.value = element;

  if (element) {
    element.classList.add("cursor-outline-active");
  }
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
  updatePointerTarget(event.clientX, event.clientY);

  if (interactiveElement) {
    setOutlinedElement(interactiveElement);
    setTargetAsPointerCircle(true);
  } else {
    setOutlinedElement(null);
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
  setOutlinedElement(null);
}

function handlePointerEnter(event: PointerEvent) {
  cursorState.visible = true;
  updatePointerTarget(event.clientX, event.clientY);
}

let cursorRafId: number | null = null;
let pointerQuery: MediaQueryList | null = null;

function animateCursor() {
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
  setOutlinedElement(null);
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
  setOutlinedElement(null);

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
  <main
    class="relative h-svh w-full overflow-hidden bg-[radial-gradient(circle_at_18%_20%,_oklch(0.37_0.08_285/.55),_transparent_36%),radial-gradient(circle_at_82%_12%,_oklch(0.35_0.1_215/.5),_transparent_38%),radial-gradient(circle_at_50%_100%,_oklch(0.29_0.08_90/.5),_transparent_45%)]"
  >
    <Carousel3D class="h-full w-full" />

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
