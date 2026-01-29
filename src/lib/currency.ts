/**
 * Centralized currency formatter for OMR (Omani Rial)
 * OMR uses 3 decimal places
 */
export const formatOMR = (amount: number): string => {
  return `${amount.toFixed(3)} OMR`;
};

/**
 * Parse a currency string back to number
 */
export const parseOMR = (value: string): number => {
  return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
};
