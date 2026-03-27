<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

const enabled = ref(false);
const visible = ref(false);
const pressed = ref(false);
const interactive = ref(false);

const currentX = ref(0);
const currentY = ref(0);
const targetX = ref(0);
const targetY = ref(0);

let rafId = 0;

function isTouchLikeDevice() {
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function tick() {
  const lerp = 0.18;
  currentX.value += (targetX.value - currentX.value) * lerp;
  currentY.value += (targetY.value - currentY.value) * lerp;
  rafId = requestAnimationFrame(tick);
}

function handlePointerMove(event: PointerEvent) {
  if (!enabled.value) return;
  targetX.value = event.clientX;
  targetY.value = event.clientY;
  visible.value = true;

  const target = event.target;
  if (!(target instanceof Element)) {
    interactive.value = false;
    return;
  }

  const hit = target.closest(
    "a, button, [role='button'], input, textarea, select, summary, label, [data-cursor='interactive']",
  );
  interactive.value = Boolean(hit);
}

function handlePointerDown() {
  if (!enabled.value) return;
  pressed.value = true;
}

function handlePointerUp() {
  if (!enabled.value) return;
  pressed.value = false;
}

function handlePointerLeave() {
  visible.value = false;
  pressed.value = false;
  interactive.value = false;
}

onMounted(() => {
  if (isTouchLikeDevice()) return;

  enabled.value = true;
  document.documentElement.classList.add("custom-cursor-enabled");

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerdown", handlePointerDown, { passive: true });
  window.addEventListener("pointerup", handlePointerUp, { passive: true });
  window.addEventListener("pointerleave", handlePointerLeave);
  window.addEventListener("blur", handlePointerLeave);

  rafId = requestAnimationFrame(tick);
});

onUnmounted(() => {
  document.documentElement.classList.remove("custom-cursor-enabled");
  cancelAnimationFrame(rafId);

  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerdown", handlePointerDown);
  window.removeEventListener("pointerup", handlePointerUp);
  window.removeEventListener("pointerleave", handlePointerLeave);
  window.removeEventListener("blur", handlePointerLeave);
});
</script>

<template>
  <div
    v-if="enabled"
    class="pointer-events-none fixed left-0 top-0 z-80"
    :style="{
      transform: `translate3d(${currentX}px, ${currentY}px, 0)`,
      opacity: visible ? 1 : 0,
    }"
  >
    <span
      class="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 backdrop-invert transition-all duration-300"
      :class="[
        interactive ? 'size-6' : 'size-2',
        pressed ? 'scale-75' : 'scale-100',
      ]"
      :style="{
        WebkitBackdropFilter: 'invert(1)',
        backdropFilter: 'invert(1)',
      }"
    />
  </div>
</template>

<style scoped>
:global(html.custom-cursor-enabled),
:global(html.custom-cursor-enabled body),
:global(html.custom-cursor-enabled a),
:global(html.custom-cursor-enabled button),
:global(html.custom-cursor-enabled input),
:global(html.custom-cursor-enabled textarea),
:global(html.custom-cursor-enabled select),
:global(html.custom-cursor-enabled [role='button']) {
  cursor: none !important;
}
</style>
