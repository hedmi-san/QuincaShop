<template>
  <div
    class="ui-skeleton"
    :class="[`shape-${shape}`]"
    :style="{ width, height }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
interface Props {
  width?: string;
  height?: string;
  shape?: 'rect' | 'circle' | 'pill';
}

withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '16px',
  shape: 'rect',
});
</script>

<style scoped>
.ui-skeleton {
  background: linear-gradient(
    90deg,
    var(--color-line) 25%,
    var(--color-subtle) 37%,
    var(--color-line) 63%
  );
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.4s ease infinite;
}

.shape-rect {
  border-radius: var(--radius-control);
}

.shape-circle {
  border-radius: 50%;
}

.shape-pill {
  border-radius: var(--radius-pill);
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>

