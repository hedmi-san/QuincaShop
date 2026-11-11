<template>
  <Transition name="ui-toast-slide">
    <div
      v-if="visible"
      class="ui-toast"
      :class="[`tone-${tone}`]"
      role="alert"
    >
      <Icon :name="iconName" :size="18" class="toast-icon" />
      <div class="toast-message">
        {{ message }}
      </div>
      <button
        type="button"
        class="toast-close"
        aria-label="Fermer"
        @click="close"
      >
        <Icon name="x" :size="14" />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Icon from './Icon.vue';

interface Props {
  message: string;
  tone?: 'success' | 'warning' | 'danger' | 'info';
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  tone: 'info',
  duration: 4000,
});

const emit = defineEmits(['close']);
const visible = ref(true);
let timer: any = null;

const iconName = computed(() => {
  switch (props.tone) {
    case 'success': return 'check-circle-2';
    case 'warning': return 'alert-circle';
    case 'danger': return 'alert-triangle';
    default: return 'info';
  }
});

function close() {
  visible.value = false;
  emit('close');
}

onMounted(() => {
  if (props.duration > 0) {
    timer = setTimeout(close, props.duration);
  }
});

onUnmounted(() => {
  if (timer) clearTimeout(timer);
});
</script>

<style scoped>
.ui-toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-md);
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  font-weight: 500;
  max-width: 420px;
  border: 1px solid transparent;
}

.tone-success {
  background-color: var(--color-success-tint);
  color: var(--color-success-text);
  border-color: var(--color-success-border);
}

.tone-warning {
  background-color: var(--color-warning-tint);
  color: var(--color-warning-text);
  border-color: var(--color-warning-border);
}

.tone-danger {
  background-color: var(--color-danger-tint);
  color: var(--color-danger-text);
  border-color: var(--color-danger-border);
}

.tone-info {
  background-color: var(--color-info-tint);
  color: var(--color-info-text);
  border-color: var(--color-info-border);
}

.toast-message {
  flex: 1;
}

.toast-close {
  background: transparent;
  border: none;
  color: currentColor;
  cursor: pointer;
  display: inline-flex;
  opacity: 0.7;
}
.toast-close:hover {
  opacity: 1;
}

.ui-toast-slide-enter-active,
.ui-toast-slide-leave-active {
  transition: all 0.25s ease;
}
.ui-toast-slide-enter-from,
.ui-toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

