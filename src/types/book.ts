export type Lang = "bn" | "en";

export type Localized = {
  bn: string;
  en: string;
};

export type CategoryId = string;

export type Book = {
  id: string;
  slug: string;
  title: Localized;
  author: Localized;
  coverImage: string;
  shortDescription: Localized;
  longDescription: Localized;
  receives: Localized;
  priceBdt: number;
  originalPriceBdt?: number;
  category: CategoryId;
  tags: Localized[];
  pages: number;
  fileSize: string;
  language: Localized;
  format: "PDF";
  featured: boolean;
  newArrival: boolean;
  visible?: boolean;
};
