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
  {
    slug: "menu-profit-ranking",
    title: "메뉴별 이익 분석: 매출 1위 메뉴가 이익 1위가 아닌 이유",
    shortTitle: "메뉴별 이익 분석",
    description:
      "판매량이 많은 메뉴가 꼭 많이 남기지는 않습니다. 홀·배달 채널별로 1개당 남는 돈을 구해 메뉴 이익 순위를 다시 매기는 방법을 분식 예시로 정리했습니다.",
    keywords: ["메뉴별 이익", "메뉴 분석", "메뉴 엔지니어링", "효자 메뉴", "배달 메뉴 마진", "공헌이익"],
    published: "2026-11-23",
    updated: "2026-11-23",
  },
  {
    slug: "ingredient-price-rise",
    title: "재료값 인상 계산: 메뉴 하나 원가는 얼마나 오를까",
    shortTitle: "재료값 인상 계산",
    description:
      "식용유·생닭 값이 오르면 메뉴 1개 원가는 얼마나 오를까. 레시피 사용량으로 메뉴별 상승분을 구하고, 판매가를 올렸을 때 채널별로 실제 얼마가 들어오는지 계산합니다.",
    keywords: ["재료값 인상", "식재료 가격 상승", "메뉴 가격 인상", "식용유 가격", "치킨 원가", "원가 상승 계산"],
    published: "2026-11-23",
    updated: "2026-11-23",
  },
  {
    slug: "chicken-delivery-margin",
    title: "치킨 배달 마진 계산: 후라이드 한 마리, 홀과 배달에서 얼마 남나",
    shortTitle: "치킨 배달 마진 계산",
    description:
      "후라이드 21,000원을 홀과 배달앱으로 팔 때 남는 돈을 비교합니다. 중개이용료·결제수수료·배달비를 빼면 한 마리에 4,853원 차이가 납니다.",
    keywords: ["치킨 배달 마진", "치킨집 수익", "치킨 원가", "치킨 배달 수수료", "후라이드 원가", "치킨집 창업"],
    published: "2026-11-23",
    updated: "2026-11-23",
  },
  {
    slug: "cafe-cost-rate",
    title: "카페 원가율 계산: 아메리카노 원가율 11%인데 왜 안 남을까",
    shortTitle: "카페 원가율 계산",
    description:
      "아메리카노 재료비는 500원이지만 컵·캐리어·배달 수수료·고정비를 넣으면 이야기가 달라집니다. 매장·테이크아웃·배달별로 한 잔에 남는 돈을 계산합니다.",
    keywords: ["카페 원가율", "아메리카노 원가", "커피 원가 계산", "카페 배달 수수료", "카페 창업", "음료 원가"],
    published: "2026-11-23",
    updated: "2026-11-23",
  },
];

export function findGuide(slug: string) {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}
