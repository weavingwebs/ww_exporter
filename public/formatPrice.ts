import big from "https://deno.land/x/bigfloat@1.0.0/mod.ts";
import { Price } from './handler.ts';

export const CURRENCY_CODES: { [currency: string]: string } = {
  EUR: "€",
  GBP: "£",
  USD: "$",
};

export const formatPrice = (price: Price, fixedDp = false): string => {
  const symbol = CURRENCY_CODES[price.currency_code];
  if (!symbol) {
    throw new Error(`Unknown currency: ${price.currency_code}`);
  }
  let formatted = big.evaluate(price.number, -2).toString();
  if (fixedDp) {
    const index = formatted.indexOf('.');
    if (index === -1) {
      formatted = formatted.concat('.00');
    }
    else if (index === formatted.length - 1) {
      formatted = formatted.concat('0');
    }
    else if (index === formatted.length - 2) {
      formatted = formatted.concat('00');
    }
  }
  else {
    formatted = formatted.replace(/\.[0]+$/, "");
  }
  return `${symbol}${formatted}`;
};
