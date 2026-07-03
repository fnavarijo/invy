export const PRODUCTS_LIMIT_OPTIONS = [100, 250, 500] as const;
export type ProductsLimitOption = (typeof PRODUCTS_LIMIT_OPTIONS)[number];
