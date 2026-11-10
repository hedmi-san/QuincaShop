<template>
  <Teleport to="body">
    <Transition name="ui-modal-fade">
      <div
        v-if="open"
        class="ui-modal-backdrop"
        tabindex="-1"
        @keydown.esc="onEsc"
      >
        <div class="backdrop-overlay" @click="onOverlayClick" />

        <div
          ref="modalCardRef"
          class="ui-modal-card"
          :class="[`max-width-${maxWidth}`]"
          role="dialog"
          :aria-labelledby="title ? 'modal-title' : undefined"
          aria-modal="true"
        >
          <!-- Sticky Header -->
          <header class="modal-header">
            <h3 v-if="title" id="modal-title" class="modal-title">{{ title }}</h3>
            <slot name="header" />
            <button
              v-if="showClose"
              type="button"
              class="modal-close-btn"
              aria-label="Fermer la boîte de dialogue"
              @click="$emit('close')"
            >
              <Icon name="x" :size="18" />
            </button>
          </header>

          <!-- Scrollable Body -->
          <div class="modal-body">
            <slot />
          </div>

          <!-- Sticky Footer -->
          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import Icon from './Icon.vue';

interface Props {
  open: boolean;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
  closeOnOverlay?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: 'md',
  showClose: true,
  closeOnOverlay: true,
});

const emit = defineEmits(['close']);
const modalCardRef = ref<HTMLElement | null>(null);

function onEsc() {
  emit('close');
}

function onOverlayClick() {
  if (props.closeOnOverlay) {
    emit('close');
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      nextTick(() => {
        modalCardRef.value?.focus();
      });
    } else {
      document.body.style.overflow = '';
    }
  }
);
</script>

<style scoped>
.ui-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.backdrop-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(2px);
}

.ui-modal-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: calc(100vh - 48px);
  background-color: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-dialog);
  box-shadow: var(--shadow-dialog);
  overflow: hidden;
  outline: none;
}

.max-width-sm { max-width: 420px; }
.max-width-md { max-width: 560px; }
.max-width-lg { max-width: 720px; }
.max-width-xl { max-width: 900px; }

.modal-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-line);
}

.modal-title {
  font-family: var(--font-sans);
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-ink);
  margin: 0;
}

.modal-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-control);
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}
.modal-close-btn:hover {
  background-color: var(--color-subtle);
  color: var(--color-ink);
}

.modal-body {
  padding: var(--space-5);
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  background-color: var(--color-subtle);
  border-top: 1px solid var(--color-line);
}

/* <= 640px: transforms into full-screen sheet */
@media (max-width: 640px) {
  .ui-modal-backdrop {
    padding: 0;
    align-items: flex-end;
  }
  .ui-modal-card {
    max-height: 92vh;
    border-radius: var(--radius-dialog) var(--radius-dialog) 0 0;
    border-bottom: none;
  }
}

/* Animations */
.ui-modal-fade-enter-active,
.ui-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.ui-modal-fade-enter-from,
.ui-modal-fade-leave-to {
  opacity: 0;
}
</style>

