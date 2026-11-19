/** Public guide articles (SEO). Content lives in src/content/guides/<slug>.tsx. */
export type Guide = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  keywords: string[];
  published: string;
  updated: string;
};

export const GUIDES: Guide[] = [
  {
    slug: "menu-cost-rate",
    title: "메뉴 원가율 계산법: 레시피로 재료비 구하고 적정 원가율 보기",
    shortTitle: "메뉴 원가율 계산법",
    description:
      "메뉴 원가율 = 재료비 ÷ 판매가. 식재료 g당 단가, 손질 수율, 포장재까지 넣어 메뉴 1개 재료비를 구하는 방법을 떡볶이 예시로 정리했습니다.",
    keywords: ["메뉴 원가율 계산", "원가율 계산법", "식재료 원가 계산", "레시피 원가", "적정 원가율", "손질 수율"],
    published: "2026-11-19",
    updated: "2026-11-19",
  },
  {
    slug: "delivery-app-fees",
    title: "배달앱 수수료 계산법: 배민·쿠팡이츠 주문 하나에 실제로 얼마 남나",
    shortTitle: "배달앱 수수료 계산법",
    description:
      "중개이용료, 결제수수료, 가게 부담 배달비를 빼면 배달 주문 하나에 얼마 남는지. 정산명세서로 내 가게의 실제 수수료율을 구하는 방법까지.",
    keywords: ["배달앱 수수료 계산", "배민 수수료 계산", "쿠팡이츠 수수료", "중개이용료", "배달비 부담", "배달 마진"],
    published: "2026-11-19",
    updated: "2026-11-19",
  },
  {
    slug: "break-even",
    title: "식당 손익분기점 계산법: 하루 얼마 팔아야 남는 장사일까",
    shortTitle: "식당 손익분기점 계산법",
    description:
      "손익분기 매출 = 월 고정비 ÷ 공헌이익률. 인건비·월세·공과금으로 한 달, 하루 손익분기 매출을 구하고 안전한계율로 여유를 보는 방법.",
    keywords: ["손익분기점 계산", "식당 손익분기점", "손익분기 매출", "공헌이익률", "영업이익 계산", "안전한계율"],
    published: "2026-11-19",
    updated: "2026-11-19",
  },
];

export function findGuide(slug: string) {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}
