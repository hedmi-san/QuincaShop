<template>
  <span
    class="ui-money font-mono"
    :class="{
      'is-positive': highlightPositive && isPositive,
      'is-alert': highlightNegative && isNegative,
      'is-zero': isZero
    }"
  >
    {{ formatted }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatMoney } from '../../lib/format';

interface Props {
  amount?: number | string | null;
  currency?: string;
  highlightNegative?: boolean;
  highlightPositive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  amount: 0,
  highlightNegative: false,
  highlightPositive: false,
});

const num = computed(() => {
  if (props.amount === null || props.amount === undefined || props.amount === '') return 0;
  const n = typeof props.amount === 'string' ? parseFloat(props.amount) : props.amount;
  return isNaN(n) ? 0 : n;
});

const isZero = computed(() => num.value === 0);
const isNegative = computed(() => num.value < 0);
const isPositive = computed(() => num.value > 0);

const formatted = computed(() => formatMoney(props.amount, props.currency));
</script>

<style scoped>
.ui-money {
  display: inline-block;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink);
}

.is-alert {
  color: var(--color-danger);
  font-weight: 600;
}

.is-positive {
  color: var(--color-success);
}

.is-zero {
  color: var(--color-text-secondary); /* Contract Section 5: Zero is neutral, not red */
}
</style>

