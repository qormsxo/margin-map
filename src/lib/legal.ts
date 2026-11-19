/**
 * Facts shown in the privacy policy and terms. Bump TERMS_VERSION when either document
 * changes in substance; signups record the version they agreed to.
 *
 * Operator name and contact come from env so the documents name a real person/business:
 *   NEXT_PUBLIC_OPERATOR_NAME     e.g. "홍길동" or "마진맵(사업자명)"
 *   NEXT_PUBLIC_SUPPORT_EMAIL     contact for privacy requests and support
 */
export const TERMS_VERSION = "2026-11-19";

export const legal = {
  effectiveDate: "2026년 11월 19일",
  serviceName: "MarginMap(마진맵)",
  operator: process.env.NEXT_PUBLIC_OPERATOR_NAME || "MarginMap 운영자",
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
} as const;
