export interface ShopRow {
  item: string;
  buy: number | null;
  sell: number | null;
}

export interface ShopViewRow extends ShopRow {
  owned: number;
  canBuy: boolean;
  canSell: boolean;
}

export interface ShopView {
  vendorId: string;
  rows: ShopViewRow[];
}

export interface TradeResult {
  ok: boolean;
  goldDelta: number;
  itemDelta: number;
  reason: string | null;
}

export const SHOP_CATALOGS: Readonly<Record<string, Readonly<ShopRow[]>>>;

export function buildShopView(opts?: {
  vendorId?: string;
  inventory?: Record<string, number>;
  gold?: number;
}): ShopView;

export function applyTrade(opts?: {
  vendorId?: string;
  item?: string;
  mode?: "buy" | "sell";
  inventory?: Record<string, number>;
  gold?: number;
}): TradeResult;
