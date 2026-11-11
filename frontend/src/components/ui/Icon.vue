<template>
  <component
    :is="iconComponent"
    v-if="iconComponent"
    :size="size"
    :stroke-width="strokeWidth"
    class="ui-icon"
    :class="[spin && 'animate-spin']"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import * as LucideIcons from 'lucide-vue-next';

interface Props {
  name: string;
  size?: number | string;
  strokeWidth?: number;
  spin?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 18,
  strokeWidth: 2,
  spin: false,
});

// Map kebab-case or lowercase names to Lucide PascalCase component names
const iconComponent = computed(() => {
  if (!props.name) return null;
  const pascalName = props.name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  // Fallback to direct lookup or with 'Icon' suffix
  const direct = (LucideIcons as any)[pascalName];
  if (direct) return direct;
  const withSuffix = (LucideIcons as any)[`${pascalName}Icon`];
  if (withSuffix) return withSuffix;

  // Generic fallback if not matched
  return (LucideIcons as any).HelpCircle || (LucideIcons as any).Circle;
});
</script>

<style scoped>
.ui-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
  color: currentColor;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

