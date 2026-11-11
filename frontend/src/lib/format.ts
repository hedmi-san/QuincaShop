import { APP_CURRENCY } from './brand';

/**
 * Format a numeric amount as currency in Algerian Dinars (DA)
 * In accordance with UI Contract rule 8:
 * - Format: '11 007,50 DA'
 * - Non-breaking space (\u00A0) for thousand separators and before currency
 * - "DA" in UI, "DZD" strictly reserved for technical exports
 * - Tabular numbers compatible
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: string = APP_CURRENCY
): string {
  if (amount === null || amount === undefined || amount === '') {
    return `0,00\u00A0${currency}`;
  }

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return `0,00\u00A0${currency}`;
  }

  const isNegative = num < 0;
  const abs = Math.abs(num);

  const parts = abs.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  const decimalPart = parts[1];

  const prefix = isNegative ? '-' : '';
  return `${prefix}${integerPart},${decimalPart}\u00A0${currency}`;
}

/**
 * Format a number with French non-breaking thousand separators
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    return '0';
  }

  const isNegative = num < 0;
  const abs = Math.abs(num);

  const parts = abs.toFixed(decimals).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');

  const prefix = isNegative ? '-' : '';
  if (decimals > 0 && parts[1] !== undefined) {
    return `${prefix}${integerPart},${parts[1]}`;
  }
  return `${prefix}${integerPart}`;
}

/**
 * Format date in French standard dd/MM/yyyy
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string'
    ? (dateInput.includes(' ') && !dateInput.includes('T') ? new Date(dateInput.replace(' ', 'T')) : new Date(dateInput))
    : dateInput;

  if (isNaN(date.getTime())) return String(dateInput);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format date and time (dd/MM/yyyy HH:mm)
 */
export function formatDateTime(
  dateInput: string | Date | null | undefined,
  includeSeconds: boolean = false
): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string'
    ? (dateInput.includes(' ') && !dateInput.includes('T') ? new Date(dateInput.replace(' ', 'T')) : new Date(dateInput))
    : dateInput;

  if (isNaN(date.getTime())) return String(dateInput);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (includeSeconds) {
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format Algerian phone numbers cleanly (e.g. 0550 11 22 33 or +213 23 92 11 22)
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  return phone.trim();
}

