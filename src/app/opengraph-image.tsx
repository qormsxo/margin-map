import { ImageResponse } from "next/og";

export const alt = "MarginMap · 메뉴 하나 팔면 얼마 남는지 보는 원가 계산기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The default OG font has no Hangul; load Pretendard (OFL) for the Korean text.
const FONT_URL = "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Bold.otf";

export default async function OpengraphImage() {
  const font = await fetch(FONT_URL).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#112a23",
          color: "#ffffff",
          fontFamily: "Pretendard",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#ff5b1f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
            }}
          >
            M
          </div>
          <div style={{ fontSize: 44 }}>MarginMap</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, lineHeight: 1.15 }}>많이 팔았는데</div>
          <div style={{ fontSize: 76, lineHeight: 1.15, color: "#ff8a5c" }}>왜 남는 게 없지?</div>
        </div>
        <div style={{ fontSize: 30, color: "#b5d0c4" }}>
          메뉴별 원가 · 배달앱 수수료 · 이번 달 진짜 남은 돈
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Pretendard", data: font, weight: 700, style: "normal" }] },
  );
}
