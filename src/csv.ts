import { CsvValue } from '../types/handler.ts';

export const makeCsvRow = (value: CsvValue): string => {
  if (!value) {
    value = '';
  }
  else {
    if (typeof value !== 'string') {
      value = String(value);
    }
    value = value.replace(/"/g, '""');
  }
  return `"${value}"`;
}
