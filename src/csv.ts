import { CsvRow } from '../handler.ts';

export const makeCsvRow = (value: string|undefined): string => {
  value = value ? value.replace(/"/g, '""') : '';
  return `"${value}"`;
}
