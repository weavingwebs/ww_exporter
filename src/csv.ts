import { CsvValue } from '../public/handler.ts';
import { formatPrice } from '../public/formatPrice.ts';

export const makeCsvRow = (value: CsvValue): string => {
  if (!value) {
    value = '';
  }
  else {
    if (typeof value === 'object') {
      // Price objects.
      if (typeof value.currency_code !== 'undefined' && typeof value.number !== 'undefined') {
        value = formatPrice(value, true);
      }
    }
    if (typeof value !== 'string') {
      value = String(value);
    }
    value = value.replace(/"/g, '""');
  }
  return `"${value}"`;
}
