/**
 * Data-wiping scripts call this first so they can never run against a hosted DB by accident.
 */
export function assertLocalDatabase() {
  const url = process.env.DATABASE_URL ?? "";

  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();

  if (["localhost", "127.0.0.1", "::1", "postgres", "db"].includes(host)) return;

  if (process.argv.includes("--allow-remote")) return;

  console.log(`로컬 DB가 아닙니다 (${host || "알 수 없음"}). 운영 데이터를 지우지 않도록 멈춥니다.`);
  console.log("정말 이 DB에 실행하려면 --allow-remote 를 붙이세요.");
  process.exit(1);
}
