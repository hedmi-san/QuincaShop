<template>
  <Modal
    :open="open"
    max-width="sm"
    :title="title"
    @close="$emit('cancel')"
  >
    <div class="confirm-content">
      <p class="confirm-message">
        {{ message }}
      </p>

      <div v-if="entityName" class="entity-highlight font-mono">
        {{ entityName }}
      </div>

      <div v-if="requireReason" class="reason-section">
        <FormField label="Motif ou justification" required :error="reasonError">
          <Textarea
            v-model="reasonText"
            :rows="2"
            placeholder="Veuillez préciser le motif..."
            @update:model-value="reasonError = null"
          />
        </FormField>
      </div>
    </div>

    <template #footer>
      <Button variant="secondary" size="dense" @click="$emit('cancel')">
        {{ cancelLabel }}
      </Button>
      <Button
        :variant="isDestructive ? 'danger' : 'primary'"
        size="dense"
        :loading="loading"
        @click="onConfirm"
      >
        {{ confirmLabel }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Modal from './Modal.vue';
import Button from './Button.vue';
import FormField from './FormField.vue';
import Textarea from './Textarea.vue';

interface Props {
  open: boolean;
  title?: string;
  message: string;
  entityName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  requireReason?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirmation requise',
  confirmLabel: 'Confirmer',
  cancelLabel: 'Annuler',
  isDestructive: false,
  requireReason: false,
  loading: false,
});

const emit = defineEmits(['confirm', 'cancel']);

const reasonText = ref('');
const reasonError = ref<string | null>(null);

function onConfirm() {
  if (props.requireReason && !reasonText.value.trim()) {
    reasonError.value = 'Le motif est obligatoire pour cette action.';
    return;
  }
  emit('confirm', reasonText.value.trim());
}
</script>

<style scoped>
.confirm-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.confirm-message {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: var(--line-height-normal);
  margin: 0;
}

.entity-highlight {
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-subtle);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  font-size: var(--font-size-sm);
  color: var(--color-ink);
  font-weight: 500;
}

.reason-section {
  margin-top: var(--space-2);
}
</style>
