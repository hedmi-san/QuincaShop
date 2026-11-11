<template>
  <a
    v-if="telHref"
    :href="telHref"
    dir="ltr"
    class="ui-phone font-mono"
  >
    {{ displayPhone }}
  </a>
  <span v-else dir="ltr" class="ui-phone font-mono">
    {{ displayPhone }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatPhone } from '../../lib/format';

interface Props {
  value?: string | null;
  link?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  link: false,
});

const displayPhone = computed(() => formatPhone(props.value));

const telHref = computed(() => {
  if (!props.link || !props.value) return null;
  const digits = props.value.replace(/[^\d+]/g, '');
  return `tel:${digits}`;
});
</script>

<style scoped>
.ui-phone {
  display: inline-block;
  direction: ltr;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: inherit;
  text-decoration: none;
}

a.ui-phone:hover {
  text-decoration: underline;
}
</style>

