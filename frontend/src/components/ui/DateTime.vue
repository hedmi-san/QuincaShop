<template>
  <time :datetime="isoString" class="ui-datetime font-mono">
    {{ formatted }}
  </time>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatDate, formatDateTime } from '../../lib/format';

interface Props {
  value?: string | Date | null;
  includeTime?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  includeTime: false,
});

const isoString = computed(() => {
  if (!props.value) return undefined;
  if (props.value instanceof Date) return props.value.toISOString();
  return String(props.value);
});

const formatted = computed(() => {
  if (props.includeTime) {
    return formatDateTime(props.value);
  }
  return formatDate(props.value);
});
</script>

<style scoped>
.ui-datetime {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink);
}
</style>

