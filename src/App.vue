<script setup lang="ts">
import { computed } from "vue";
import { motion } from "motion-v";
import { useDark, useToggle } from "@vueuse/core";

const isDark = useDark({
  selector: "html",
  attribute: "class",
  valueDark: "dark",
  valueLight: "light",
});

const toggleDark = useToggle(isDark);
const modeText = computed(() => (isDark.value ? "Dark" : "Light"));
</script>

<template>
  <main class="h-svh w-full overflow-hidden">
    <section class="relative grid h-full w-full place-items-center">
      
    </section>
  </main>
</template>
