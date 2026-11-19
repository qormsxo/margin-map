/**
 * Public site facts used for SEO (metadata, robots, sitemap, OG image).
 * URL order: explicit setting → Vercel production domain → local dev.
 */
function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;

  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

export const site = {
  name: "MarginMap",
  koreanName: "마진맵",
  url: resolveSiteUrl(),
  title: "MarginMap · 메뉴 하나 팔면 얼마 남는지 보는 원가 계산기",
  description:
    "식당·카페 사장님을 위한 메뉴 원가·마진 계산기. 레시피로 재료비를 계산하고 배민·쿠팡이츠 수수료와 배달비까지 빼서 메뉴별로 남는 돈, 이번 달 영업이익, 손익분기 매출을 보여 줍니다. 재료값이 오르면 바로 알려 드립니다.",
  keywords: [
    "메뉴 원가 계산",
    "원가율 계산기",
    "식당 마진 계산",
    "음식점 원가 관리",
    "레시피 원가",
    "배민 수수료 계산",
    "쿠팡이츠 수수료",
    "배달앱 수수료 계산",
    "손익분기점 계산",
    "카페 원가 계산",
    "치킨집 원가",
    "자영업 장부",
    "식자재 가격 관리",
  ],
} as const;
