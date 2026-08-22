export const STORE_NAME = "Canvix Store";

export const OWNER_EMAIL = "dev.get.in.touch@gmail.com";

export const PAYMENT_NUMBERS = {
  bkash: "01318080805",
  rocket: "01318080805",
} as const;

export type PaymentMethod = keyof typeof PAYMENT_NUMBERS;
