<script lang="ts" setup>
import { cn } from "@inspira-ui/plugins";
import { onMounted, onUnmounted, ref, watch } from "vue";

interface Props {
  class?: string;
  texts: string[];
  active?: boolean;
  morphTime?: number;
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  morphTime: 0.65,
});

const TEXT_CLASSES = "absolute inset-0 inline-flex w-full items-center justify-center";

const text1Ref = ref<HTMLSpanElement>();
const text2Ref = ref<HTMLSpanElement>();
const displayedText = ref("");
const animatingTargetText = ref<string | null>(null);
const isMorphing = ref(false);
const filterId = `threshold-${Math.random().toString(36).slice(2, 10)}`;

let animationFrameId = 0;
let activeAnimationToken = 0;

function setFinalState(value: string) {
  if (!text1Ref.value || !text2Ref.value) return;

  text1Ref.value.textContent = value;
  text2Ref.value.textContent = value;
  text1Ref.value.style.filter = "none";
  text1Ref.value.style.opacity = "0%";
  text2Ref.value.style.filter = "none";
  text2Ref.value.style.opacity = "100%";
}

function setMorphState(fromText: string, toText: string, fraction: number) {
  if (!text1Ref.value || !text2Ref.value) return;

  const safeFraction = Math.min(Math.max(fraction, 0.0001), 1);
  const safeInvertedFraction = Math.min(Math.max(1 - fraction, 0.0001), 1);

  text1Ref.value.textContent = fromText;
  text2Ref.value.textContent = toText;

  text2Ref.value.style.filter = `blur(${Math.min(8 / safeFraction - 8, 100)}px)`;
  text2Ref.value.style.opacity = `${safeFraction ** 0.4 * 100}%`;
  text1Ref.value.style.filter = `blur(${Math.min(8 / safeInvertedFraction - 8, 100)}px)`;
  text1Ref.value.style.opacity = `${safeInvertedFraction ** 0.4 * 100}%`;
}

function getTargetText() {
  if (props.texts.length === 0) return "";
  if (props.texts.length === 1) return props.texts[0];
  return props.active ? props.texts[1] : props.texts[0];
}

function morphTo(targetText: string) {
  if (!text1Ref.value || !text2Ref.value) return;
  if (displayedText.value === targetText && animatingTargetText.value === null) {
    isMorphing.value = false;
    setFinalState(targetText);
    return;
  }

  const fromText = animatingTargetText.value ?? displayedText.value ?? targetText;
  const toText = targetText;
  const start = performance.now();
  const durationMs = Math.max(props.morphTime * 1000, 16);
  const token = ++activeAnimationToken;
  animatingTargetText.value = toText;
  isMorphing.value = true;

  cancelAnimationFrame(animationFrameId);

  const animate = (now: number) => {
    if (token !== activeAnimationToken) return;

    const elapsed = now - start;
    const fraction = Math.min(elapsed / durationMs, 1);

    setMorphState(fromText, toText, fraction);

    if (fraction < 1) {
      animationFrameId = requestAnimationFrame(animate);
      return;
    }

    displayedText.value = toText;
    animatingTargetText.value = null;
    isMorphing.value = false;
    setFinalState(toText);
  };

  animationFrameId = requestAnimationFrame(animate);
}

function syncToCurrentState() {
  const target = getTargetText();

  if (!displayedText.value) {
    displayedText.value = target;
    animatingTargetText.value = null;
    isMorphing.value = false;
    setFinalState(target);
    return;
  }
  morphTo(target);
}

watch(
  () => props.active,
  () => {
    syncToCurrentState();
  },
);

watch(
  () => props.texts,
  () => {
    syncToCurrentState();
  },
  { deep: true },
);

onMounted(() => {
  const initial = getTargetText();
  displayedText.value = initial;
  setFinalState(initial);
});

onUnmounted(() => {
  activeAnimationToken++;
  isMorphing.value = false;
  cancelAnimationFrame(animationFrameId);
});
</script>

<template>
  <div
    :style="{ filter: isMorphing ? `url(#${filterId}) blur(0.6px)` : 'none' }"
    :class="
      cn(
        `relative mx-auto h-full w-full leading-none`,
        props.class,
      )
    "
  >
    <span
      ref="text1Ref"
      :class="[TEXT_CLASSES]"
    />
    <span
      ref="text2Ref"
      :class="[TEXT_CLASSES]"
    />

    <svg
      class="fixed size-0"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <filter :id="filterId">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 255 -140"
          />
        </filter>
      </defs>
    </svg>
  </div>
</template>
