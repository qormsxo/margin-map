"use client";

/** Last resort when the root layout itself fails (e.g. DB down while loading the shell). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#f6f3ec",
          color: "#14251f",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>잠깐 문제가 생겼어요</h1>
          <p style={{ color: "#5f6d67", fontSize: 14 }}>입력하신 데이터는 안전합니다. 잠시 후 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 12,
              border: 0,
              borderRadius: 999,
              padding: "10px 20px",
              background: "#ff5b1f",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
