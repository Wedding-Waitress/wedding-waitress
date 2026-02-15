/**
 * Stripe Extension Price ID mappings for plan extensions.
 * 21 prices: 7 durations × 3 plans (Essential, Premium, Unlimited).
 */

export interface ExtensionOption {
  months: number;
  label: string;
  price_aud: number;
  price_id: string;
  product_id: string;
}

export const EXTENSION_PRICES: Record<string, ExtensionOption[]> = {
  Essential: [
    { months: 1,  label: '1 Month',   price_aud: 19,  price_id: 'price_1T0w9r5GzTmqOxGKI8Qq5JIn', product_id: 'prod_TytxX16sHIR9nG' },
    { months: 2,  label: '2 Months',  price_aud: 35,  price_id: 'price_1T0wIm5GzTmqOxGKs0lbEKUc', product_id: 'prod_Tyu7cnAAMQfoWM' },
    { months: 3,  label: '3 Months',  price_aud: 49,  price_id: 'price_1T0wJr5GzTmqOxGKBSxoe3cE', product_id: 'prod_Tyu8DeDOjwI7kF' },
    { months: 4,  label: '4 Months',  price_aud: 59,  price_id: 'price_1T0wL95GzTmqOxGKYgM9GFQX', product_id: 'prod_Tyu9Penbgx0b5M' },
    { months: 5,  label: '5 Months',  price_aud: 69,  price_id: 'price_1T0wLv5GzTmqOxGKu0T3OaRK', product_id: 'prod_TyuAWtZzBIK8VU' },
    { months: 6,  label: '6 Months',  price_aud: 79,  price_id: 'price_1T0wNI5GzTmqOxGKwVaej0bx', product_id: 'prod_TyuBFmQiiIO7aU' },
    { months: 12, label: '12 Months', price_aud: 99,  price_id: 'price_1T0wO85GzTmqOxGKcve1XWgt', product_id: 'prod_TyuChtV169WvvQ' },
  ],
  Premium: [
    { months: 1,  label: '1 Month',   price_aud: 29,  price_id: 'price_1T0wZW5GzTmqOxGKkh1rFruc', product_id: 'prod_TyuO2FCjdV9e4c' },
    { months: 2,  label: '2 Months',  price_aud: 49,  price_id: 'price_1T0wZu5GzTmqOxGKQuwZs8Wg', product_id: 'prod_TyuOOztgn9A91A' },
    { months: 3,  label: '3 Months',  price_aud: 69,  price_id: 'price_1T0waF5GzTmqOxGKz1PBzaUO', product_id: 'prod_TyuPcRhvbTuVaQ' },
    { months: 4,  label: '4 Months',  price_aud: 85,  price_id: 'price_1T0wbX5GzTmqOxGKJdhdERAp', product_id: 'prod_TyuQ0vCns1b6sN' },
    { months: 5,  label: '5 Months',  price_aud: 99,  price_id: 'price_1T0wcZ5GzTmqOxGK6N1L9Tlu', product_id: 'prod_TyuRtJpRuT1GWs' },
    { months: 6,  label: '6 Months',  price_aud: 109, price_id: 'price_1T0wdL5GzTmqOxGKTrQOWFV7', product_id: 'prod_TyuSqYELiHGkIS' },
    { months: 12, label: '12 Months', price_aud: 149, price_id: 'price_1T0wdo5GzTmqOxGKE4UEHDSf', product_id: 'prod_TyuScTpMTUDABh' },
  ],
  Unlimited: [
    { months: 1,  label: '1 Month',   price_aud: 39,  price_id: 'price_1T0weB5GzTmqOxGKqxAVhajU', product_id: 'prod_TyuTlpKyA7RoeG' },
    { months: 2,  label: '2 Months',  price_aud: 69,  price_id: 'price_1T0wet5GzTmqOxGK5TrSDQTv', product_id: 'prod_TyuTVX1fTZbeCc' },
    { months: 3,  label: '3 Months',  price_aud: 99,  price_id: 'price_1T0wfE5GzTmqOxGKZQT1qAvm', product_id: 'prod_TyuUVFhtZRyVYj' },
    { months: 4,  label: '4 Months',  price_aud: 119, price_id: 'price_1T0wfV5GzTmqOxGKq9yzzT8A', product_id: 'prod_TyuUsIDNTY1S16' },
    { months: 5,  label: '5 Months',  price_aud: 139, price_id: 'price_1T0wfp5GzTmqOxGK60inMQ6S', product_id: 'prod_TyuUvck5CobTGg' },
    { months: 6,  label: '6 Months',  price_aud: 149, price_id: 'price_1T0wgH5GzTmqOxGK6barvfO3', product_id: 'prod_TyuVXb9EZNXWEz' },
    { months: 12, label: '12 Months', price_aud: 249, price_id: 'price_1T0wgq5GzTmqOxGKlVp7JGrk', product_id: 'prod_TyuVFVumB5xkRa' },
  ],
};

/** All extension product IDs for lookup in verify-payment */
export const EXTENSION_PRODUCT_IDS = new Set(
  Object.values(EXTENSION_PRICES).flatMap(options => options.map(o => o.product_id))
);

/** Find extension details by product ID */
export const getExtensionByProductId = (productId: string) => {
  for (const [planName, options] of Object.entries(EXTENSION_PRICES)) {
    const option = options.find(o => o.product_id === productId);
    if (option) return { planName, ...option };
  }
  return null;
};
