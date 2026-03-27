<script lang="ts" setup>
import type { AnimationPlaybackControls } from "motion-v";
import type { HTMLAttributes } from "vue";
import { animate } from "motion-v";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import * as THREE from "three";
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";

import { cn } from "@/lib/utils";

interface Props {
  items?: string[];
  class?: HTMLAttributes["class"];
  containerClass?: HTMLAttributes["class"];
  width?: number;
  height?: number;
}

interface CarouselNode {
  element: HTMLDivElement;
  object: CSS3DObject;
  angle: number;
  image: string;
}

const props = withDefaults(defineProps<Props>(), {
  class: "",
  containerClass: "",
  width: 460,
  height: 620,
  items: () => [
    "https://images.pexels.com/photos/799443/pexels-photo-799443.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://images.pexels.com/photos/16245254/pexels-photo-16245254/free-photo-of-chatgpt-a-chatbot-for-your-website.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://images.pexels.com/photos/1910236/pexels-photo-1910236.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://images.pexels.com/photos/2832382/pexels-photo-2832382.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://images.pexels.com/photos/2333293/pexels-photo-2333293.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://images.pexels.com/photos/604684/pexels-photo-604684.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://images.pexels.com/photos/3308588/pexels-photo-3308588.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://images.pexels.com/photos/2860807/pexels-photo-2860807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  ],
});

const carouselContainer = ref<HTMLDivElement>();
const isPointerDown = ref(false);
const isDragging = ref(false);
const startX = ref(0);
const currentX = ref(0);
const hoverCount = ref(0);

const sensitivity = 0.0032;
const cameraOffsetX = 60;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 1, 5000);
let renderer: CSS3DRenderer;
let carousel: THREE.Object3D;
const nodes: CarouselNode[] = [];
const cleanupCallbacks: Array<() => void> = [];

const radius = ref(760);
const continuousAnimation = ref<AnimationPlaybackControls | null>(null);

const isModalVisible = ref(false);
const isModalExpanded = ref(false);
const isModalTransitioning = ref(false);
const selectedImage = ref<string | null>(null);
const selectedSourceElement = ref<HTMLElement | null>(null);

const modalRect = reactive({
  top: 0,
  left: 0,
  width: 0,
  height: 0,
  radius: 24,
});

const modalStyle = computed(() => ({
  top: `${modalRect.top}px`,
  left: `${modalRect.left}px`,
  width: `${modalRect.width}px`,
  height: `${modalRect.height}px`,
  borderRadius: `${modalRect.radius}px`,
}));

function setModalRect(rect: { top: number; left: number; width: number; height: number; radius: number }) {
  modalRect.top = rect.top;
  modalRect.left = rect.left;
  modalRect.width = rect.width;
  modalRect.height = rect.height;
  modalRect.radius = rect.radius;
}

function getViewportModalRect() {
  const padX = window.innerWidth * 0.05;
  const padY = window.innerHeight * 0.05;

  return {
    top: padY,
    left: padX,
    width: window.innerWidth - padX * 2,
    height: window.innerHeight - padY * 2,
    radius: 24,
  };
}

function getCardSize(viewWidth: number, viewHeight: number) {
  const isMobile = viewWidth < 768;
  const widthRatio = isMobile ? 0.6 : 0.32;
  const heightRatio = isMobile ? 0.56 : 0.74;

  return {
    width: Math.min(props.width, Math.max(190, viewWidth * widthRatio)),
    height: Math.min(props.height, Math.max(260, viewHeight * heightRatio)),
  };
}

function updateNodesLayout() {
  if (!carouselContainer.value) {
    return;
  }

  const width = carouselContainer.value.clientWidth;
  const height = carouselContainer.value.clientHeight;
  const cardSize = getCardSize(width, height);

  radius.value = Math.max(width, height) * (width < 768 ? 0.74 : 0.62);

  nodes.forEach((node) => {
    node.element.style.width = `${cardSize.width}px`;
    node.element.style.height = `${cardSize.height}px`;
    node.object.position.setFromSphericalCoords(radius.value, Math.PI / 2, node.angle);
    node.object.lookAt(carousel.position);
  });

  renderer.render(scene, camera);
}

function stopContinuousRotation() {
  if (!continuousAnimation.value) {
    return;
  }

  continuousAnimation.value.stop();
  continuousAnimation.value = null;
}

function startContinuousRotation() {
  if (continuousAnimation.value || isModalVisible.value || hoverCount.value > 0 || isDragging.value) {
    return;
  }

  const fromVal = carousel.rotation.y;
  const toVal = fromVal + Math.PI * 2;

  continuousAnimation.value = animate(fromVal, toVal, {
    duration: 22,
    ease: "linear",
    repeat: Infinity,
    repeatType: "loop",
    onUpdate: (latest) => {
      carousel.rotation.y = latest;
      renderer.render(scene, camera);
    },
  });
}

function maybeResumeRotation() {
  if (isModalVisible.value || isDragging.value || hoverCount.value > 0 || isPointerDown.value) {
    return;
  }

  startContinuousRotation();
}

function openModal(image: string, sourceElement: HTMLElement) {
  if (isModalVisible.value || isModalTransitioning.value) {
    return;
  }

  const sourceRect = sourceElement.getBoundingClientRect();

  selectedImage.value = image;
  selectedSourceElement.value = sourceElement;
  isModalVisible.value = true;
  isModalExpanded.value = false;
  isModalTransitioning.value = true;

  stopContinuousRotation();

  setModalRect({
    top: sourceRect.top,
    left: sourceRect.left,
    width: sourceRect.width,
    height: sourceRect.height,
    radius: 20,
  });

  nextTick(() => {
    requestAnimationFrame(() => {
      setModalRect(getViewportModalRect());
      isModalExpanded.value = true;
    });
  });
}

function closeModal() {
  if (!isModalVisible.value || !selectedImage.value) {
    return;
  }

  isModalTransitioning.value = true;
  isModalExpanded.value = false;

  const source = selectedSourceElement.value;

  if (source && source.isConnected) {
    const rect = source.getBoundingClientRect();

    setModalRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      radius: 20,
    });

    return;
  }

  setModalRect({
    top: window.innerHeight * 0.5 - 160,
    left: window.innerWidth * 0.5 - 120,
    width: 240,
    height: 320,
    radius: 20,
  });
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target !== event.currentTarget) {
    return;
  }

  closeModal();
}

function handleModalTransitionEnd(event: TransitionEvent) {
  if (event.target !== event.currentTarget || event.propertyName !== "height") {
    return;
  }

  if (isModalExpanded.value) {
    isModalTransitioning.value = false;
    return;
  }

  isModalVisible.value = false;
  selectedImage.value = null;
  selectedSourceElement.value = null;
  isModalTransitioning.value = false;

  maybeResumeRotation();
}

function setupCardElement(image: string, index: number, total: number) {
  const element = document.createElement("div");
  element.classList.add("carousel-3d-item");
  element.style.backgroundImage = `url(${image})`;
  element.style.backgroundSize = "cover";
  element.style.backgroundPosition = "center";
  element.dataset.cursorInteractive = "true";

  const object = new CSS3DObject(element);
  const angle = (index / total) * Math.PI * 2;

  object.position.setFromSphericalCoords(radius.value, Math.PI / 2, angle);
  object.lookAt(carousel.position);

  const onMouseEnter = () => {
    hoverCount.value += 1;
    stopContinuousRotation();
  };

  const onMouseLeave = () => {
    hoverCount.value = Math.max(0, hoverCount.value - 1);
    maybeResumeRotation();
  };

  const onClick = () => {
    if (isDragging.value || isPointerDown.value) {
      return;
    }

    openModal(image, element);
  };

  element.addEventListener("mouseenter", onMouseEnter);
  element.addEventListener("mouseleave", onMouseLeave);
  element.addEventListener("click", onClick);

  cleanupCallbacks.push(() => {
    element.removeEventListener("mouseenter", onMouseEnter);
    element.removeEventListener("mouseleave", onMouseLeave);
    element.removeEventListener("click", onClick);
  });

  return { element, object, angle, image };
}

function onPointerDown(event: PointerEvent) {
  if (isModalVisible.value) {
    return;
  }

  isPointerDown.value = true;
  isDragging.value = false;
  startX.value = event.clientX;
  currentX.value = event.clientX;

  stopContinuousRotation();
}

function onPointerMove(event: PointerEvent) {
  if (!isPointerDown.value || isModalVisible.value) {
    return;
  }

  const deltaX = event.clientX - currentX.value;
  currentX.value = event.clientX;

  if (Math.abs(event.clientX - startX.value) > 3) {
    isDragging.value = true;
  }

  carousel.rotation.y += -deltaX * sensitivity;
  renderer.render(scene, camera);
}

function onPointerUp() {
  if (!isPointerDown.value) {
    return;
  }

  isPointerDown.value = false;

  requestAnimationFrame(() => {
    isDragging.value = false;
    maybeResumeRotation();
  });
}

function onWindowResize() {
  if (!carouselContainer.value) {
    return;
  }

  const width = carouselContainer.value.clientWidth;
  const height = carouselContainer.value.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);

  updateNodesLayout();

  if (isModalVisible.value && isModalExpanded.value) {
    setModalRect(getViewportModalRect());
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") {
    return;
  }

  closeModal();
}

onMounted(() => {
  if (!carouselContainer.value) {
    return;
  }

  renderer = new CSS3DRenderer();
  renderer.setSize(carouselContainer.value.clientWidth, carouselContainer.value.clientHeight);
  renderer.domElement.className = "carousel-3d-renderer";
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.touchAction = "none";
  carouselContainer.value.appendChild(renderer.domElement);

  camera.position.z = 560;
  camera.position.y = 0;
  camera.position.x = cameraOffsetX;
  camera.lookAt(0, 0, 0);

  carousel = new THREE.Object3D();
  scene.add(carousel);

  props.items.forEach((image, index) => {
    const node = setupCardElement(image, index, props.items.length);
    nodes.push(node);
    carousel.add(node.object);
  });

  carousel.rotation.x = 0;

  updateNodesLayout();
  startContinuousRotation();

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerUp);
  renderer.domElement.addEventListener("pointerleave", onPointerUp);

  cleanupCallbacks.push(() => {
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    renderer.domElement.removeEventListener("pointercancel", onPointerUp);
    renderer.domElement.removeEventListener("pointerleave", onPointerUp);
  });

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  cleanupCallbacks.forEach((cleanup) => cleanup());
  cleanupCallbacks.length = 0;

  window.removeEventListener("resize", onWindowResize);
  window.removeEventListener("keydown", handleKeydown);

  stopContinuousRotation();

  if (carouselContainer.value && renderer) {
    carouselContainer.value.removeChild(renderer.domElement);
  }
});
</script>

<template>
  <div
    ref="carouselContainer"
    :class="cn('relative h-full w-full overflow-hidden', props.containerClass, props.class)"
  >
    <div
      v-if="isModalVisible"
      class="fixed inset-0 z-50"
      :class="isModalExpanded ? 'pointer-events-auto' : 'pointer-events-none'"
    >
      <div
        class="absolute inset-0 bg-black/62 transition-opacity duration-500"
        :class="isModalExpanded ? 'opacity-100' : 'opacity-0'"
        data-cursor-interactive="true"
        @click="handleBackdropClick"
      />

      <article
        v-if="selectedImage"
        class="carousel-3d-modal"
        :style="modalStyle"
        @transitionend="handleModalTransitionEnd"
      >
        <img :src="selectedImage" alt="Selected carousel item" class="h-full w-full object-cover" />

        <button
          type="button"
          class="absolute top-4 right-4 inline-flex h-10 items-center rounded-full bg-black/55 px-4 text-sm font-medium text-white backdrop-blur-sm"
          data-cursor-interactive="true"
          @click="closeModal"
        >
          닫기
        </button>
      </article>
    </div>
  </div>
</template>
