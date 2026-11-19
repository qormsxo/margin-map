/**
 * Onboarding catalog: channel fee presets and per-industry ingredient suggestions.
 * Fee rates are typical 2026 examples; owners correct them to their contract.
 */

export type ChannelPreset = {
  name: string;
  channelFeeRate: number;
  paymentFeeRate: number;
  deliveryFeeFixed: number;
};

export const CHANNEL_PRESETS: ChannelPreset[] = [
  { name: "홀", channelFeeRate: 0, paymentFeeRate: 0.015, deliveryFeeFixed: 0 },
  { name: "배민", channelFeeRate: 0.078, paymentFeeRate: 0.03, deliveryFeeFixed: 2900 },
  { name: "쿠팡이츠", channelFeeRate: 0.078, paymentFeeRate: 0.03, deliveryFeeFixed: 2900 },
  { name: "요기요", channelFeeRate: 0.097, paymentFeeRate: 0.03, deliveryFeeFixed: 2900 },
  { name: "땡겨요", channelFeeRate: 0.02, paymentFeeRate: 0.03, deliveryFeeFixed: 2900 },
  { name: "포장", channelFeeRate: 0, paymentFeeRate: 0.015, deliveryFeeFixed: 0 },
];

export type SuggestedIngredient = {
  name: string;
  /** Purchase unit the owner usually buys in. */
  unit: "KG" | "G" | "L" | "ML" | "EA";
  /** Usual pack size in that unit. */
  qty: number;
};

export type BusinessType = {
  id: string;
  label: string;
  emoji: string;
  channels: string[];
  ingredients: SuggestedIngredient[];
};

export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: "CHICKEN",
    label: "치킨·호프",
    emoji: "🍗",
    channels: ["홀", "배민", "쿠팡이츠"],
    ingredients: [
      { name: "생닭 10호", unit: "EA", qty: 1 },
      { name: "튀김가루", unit: "KG", qty: 10 },
      { name: "식용유", unit: "L", qty: 18 },
      { name: "양념소스", unit: "KG", qty: 10 },
      { name: "치킨무", unit: "EA", qty: 100 },
      { name: "콜라 1.25L", unit: "EA", qty: 12 },
      { name: "포장박스", unit: "EA", qty: 100 },
      { name: "생맥주", unit: "L", qty: 20 },
    ],
  },
  {
    id: "CAFE",
    label: "카페·디저트",
    emoji: "☕",
    channels: ["홀", "배민", "포장"],
    ingredients: [
      { name: "원두", unit: "KG", qty: 1 },
      { name: "우유", unit: "L", qty: 1 },
      { name: "아이스컵 16oz", unit: "EA", qty: 1000 },
      { name: "핫컵 13oz", unit: "EA", qty: 1000 },
      { name: "컵뚜껑", unit: "EA", qty: 1000 },
      { name: "시럽", unit: "L", qty: 1 },
      { name: "얼음", unit: "KG", qty: 3 },
      { name: "빨대", unit: "EA", qty: 500 },
    ],
  },
  {
    id: "CHINESE",
    label: "중식",
    emoji: "🥢",
    channels: ["홀", "배민", "쿠팡이츠"],
    ingredients: [
      { name: "중화면", unit: "KG", qty: 10 },
      { name: "춘장", unit: "KG", qty: 10 },
      { name: "양파", unit: "KG", qty: 15 },
      { name: "돼지고기 앞다리", unit: "KG", qty: 5 },
      { name: "오징어", unit: "KG", qty: 5 },
      { name: "식용유", unit: "L", qty: 18 },
      { name: "단무지", unit: "KG", qty: 3 },
      { name: "배달용기", unit: "EA", qty: 100 },
    ],
  },
  {
    id: "KOREAN",
    label: "한식·백반",
    emoji: "🍚",
    channels: ["홀", "배민"],
    ingredients: [
      { name: "쌀", unit: "KG", qty: 20 },
      { name: "돼지고기", unit: "KG", qty: 5 },
      { name: "김치", unit: "KG", qty: 10 },
      { name: "두부", unit: "EA", qty: 1 },
      { name: "대파", unit: "KG", qty: 1 },
      { name: "양파", unit: "KG", qty: 15 },
      { name: "계란 30구", unit: "EA", qty: 30 },
      { name: "고춧가루", unit: "KG", qty: 1 },
    ],
  },
  {
    id: "BUNSIK",
    label: "분식",
    emoji: "🍢",
    channels: ["홀", "배민", "쿠팡이츠"],
    ingredients: [
      { name: "떡볶이떡", unit: "KG", qty: 4 },
      { name: "어묵", unit: "KG", qty: 1 },
      { name: "고추장", unit: "KG", qty: 14 },
      { name: "김밥김", unit: "EA", qty: 100 },
      { name: "쌀", unit: "KG", qty: 20 },
      { name: "튀김가루", unit: "KG", qty: 10 },
      { name: "라면사리", unit: "EA", qty: 40 },
      { name: "포장용기", unit: "EA", qty: 100 },
    ],
  },
  {
    id: "OTHER",
    label: "기타",
    emoji: "🍽️",
    channels: ["홀"],
    ingredients: [
      { name: "양파", unit: "KG", qty: 15 },
      { name: "대파", unit: "KG", qty: 1 },
      { name: "식용유", unit: "L", qty: 18 },
      { name: "설탕", unit: "KG", qty: 15 },
      { name: "계란 30구", unit: "EA", qty: 30 },
    ],
  },
];

export function findBusinessType(id: string | null | undefined) {
  return BUSINESS_TYPES.find((t) => t.id === id) ?? null;
}
