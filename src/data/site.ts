export const STORE_NAME = "Canvix Store";

export const PAYMENT_NUMBERS = {
  bkash: "01318080805",
  rocket: "01318080805",
} as const;

export type PaymentOption = {
  id: string;
  name: string;
  number: string;
  enabled: boolean;
};

export const DEFAULT_PAYMENT_METHODS: PaymentOption[] = [
  { id: "bkash", name: "bKash", number: PAYMENT_NUMBERS.bkash, enabled: true },
  { id: "rocket", name: "Rocket", number: PAYMENT_NUMBERS.rocket, enabled: true },
];

export type PaymentMethod = string;
