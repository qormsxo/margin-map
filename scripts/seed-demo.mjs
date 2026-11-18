#!/usr/bin/env node
/**
 * 데모 매장 3곳(치킨집·카페·중국집)을 API로 채운다.
 * 재료 단가·레시피·판매가·인건비는 2026년 공개 자료를 근거로 했고, 근거가 없는 값은 "가정"이다.
 * 근거와 출처: docs/sample-data.md
 *
 *   npm run dev                                   # 다른 터미널
 *   node scripts/seed-demo.mjs [http://localhost:3000] [--reset]
 *
 * --reset: 데모 계정 3개(@example.test)의 기존 데이터를 DB에서 지우고 다시 만든다.
 *          (.env의 DATABASE_URL에 직접 접속. 다른 계정은 건드리지 않는다.)
 * --clean: 데모 계정 3개를 지우기만 한다 (서버 불필요). 직접 입력해 보기 전에 쓴다.
 */

const args = process.argv.slice(2);
const RESET = args.includes("--reset");
const BASE = (args.find((a) => a.startsWith("http")) ?? "http://localhost:3000").replace(/\/$/, "") + "/api/v1";
const PASSWORD = "demo-pass-1234";

// 판매 채널. 배달비는 "주문 1건당" 점주 부담분이며, 주문 건수가 있으면 건수로 뺀다.
// 배민 상생요금제 상위 구간: 중개 7.8%, 배달비 2,400~3,400원 (부가세 별도) → 2,900원 사용.
const CHANNELS = [
  { key: "홀", name: "홀", channelFeeRate: 0, paymentFeeRate: 0.015, deliveryFeeRate: 0, deliveryFeeFixed: 0, isDefault: true },
  { key: "배민", name: "배민", channelFeeRate: 0.078, paymentFeeRate: 0.03, deliveryFeeRate: 0, deliveryFeeFixed: 2900 },
  { key: "쿠팡", name: "쿠팡이츠", channelFeeRate: 0.078, paymentFeeRate: 0.03, deliveryFeeRate: 0, deliveryFeeFixed: 2900 },
];

// 2026 최저임금 시급 10,320원, 월 환산 2,156,880원(주 40h). 4대보험 사업주분 약 10% 가산.
const FULLTIME_PARTTIMER = 2370000;

const STORES = [
  {
    email: "chicken@example.test",
    storeName: "바삭치킨",
    // [이름, 단위, 구매수량(기본단위), 구매가, 수율%]
    ingredients: [
      ["생닭 10호(20마리 박스)", "EA", 20, 134000, 100],
      ["치킨 파우더", "G", 5000, 15000, 100],
      ["콩기름 18L", "ML", 18000, 62000, 100],
      ["양념소스", "G", 2000, 9800, 100],
      ["대파", "G", 1000, 3500, 85],
      ["치킨무 170g", "EA", 60, 25000, 100],
      ["치킨 포장박스", "EA", 100, 45000, 100],
      ["콜라 1.25L", "EA", 12, 18000, 100],
    ],
    // [메뉴, 판매가, [[재료, 양, 단위], ...]]
    menus: [
      ["후라이드치킨", 21000, [["생닭 10호(20마리 박스)", 1, "EA"], ["치킨 파우더", 180, "G"], ["콩기름 18L", 250, "ML"], ["치킨무 170g", 1, "EA"], ["치킨 포장박스", 1, "EA"]]],
      ["양념치킨", 22000, [["생닭 10호(20마리 박스)", 1, "EA"], ["치킨 파우더", 180, "G"], ["콩기름 18L", 250, "ML"], ["양념소스", 150, "G"], ["치킨무 170g", 1, "EA"], ["치킨 포장박스", 1, "EA"]]],
      ["파닭", 23000, [["생닭 10호(20마리 박스)", 1, "EA"], ["치킨 파우더", 180, "G"], ["콩기름 18L", 250, "ML"], ["대파", 100, "G"], ["양념소스", 80, "G"], ["치킨무 170g", 1, "EA"], ["치킨 포장박스", 1, "EA"]]],
      ["콜라 1.25L", 2500, [["콜라 1.25L", 1, "EA"]]],
    ],
    // 2026년 10월 판매량 [메뉴, 홀, 배민, 쿠팡이츠] — 배달 비중 약 80% 가정
    sales: [
      ["후라이드치킨", 120, 380, 210],
      ["양념치킨", 90, 320, 180],
      ["파닭", 40, 150, 90],
      ["콜라 1.25L", 60, 260, 140],
    ],
    // 배달 주문 건수 (치킨 약 1.1마리/주문 가정)
    orders: { 배민: 770, 쿠팡: 435 },
    fixedCosts: [
      ["알바 2명 (주40h + 주20h)", "LABOR", FULLTIME_PARTTIMER + 1190000],
      ["월세 (15평, 가정)", "RENT", 1800000],
      ["가스·전기·수도", "UTILITIES", 700000],
      ["포스·인터넷·보험·세무", "OTHER", 350000],
    ],
    // [날짜, 금액, 거래처]
    purchases: [
      ["2026-10-02", 2680000, "닭 대리점"],
      ["2026-10-05", 1450000, "식자재마트 (파우더·소스·대파)"],
      ["2026-10-09", 2680000, "닭 대리점"],
      ["2026-10-10", 1300000, "기름 (18L × 21캔)"],
      ["2026-10-12", 1450000, "포장재·치킨무"],
      ["2026-10-12", 700000, "음료"],
      ["2026-10-16", 2680000, "닭 대리점"],
      ["2026-10-19", 1400000, "식자재마트 (파우더·소스·대파)"],
      ["2026-10-23", 2680000, "닭 대리점"],
    ],
    // 이상징후 데모: 튀김유 공급가 인상 (2026 bhc 20%, 교촌 10% 인상 보도)
    priceShock: ["콩기름 18L", 74000],
  },
  {
    email: "cafe@example.test",
    storeName: "온기커피",
    ingredients: [
      ["원두 (블렌드)", "G", 1000, 25000, 100],
      ["우유 1L", "ML", 1000, 2980, 100],
      ["바닐라시럽", "ML", 1000, 12000, 100],
      ["생딸기", "G", 1000, 15000, 85],
      ["생크림", "ML", 1000, 7500, 100],
      ["크로플 생지", "EA", 50, 35000, 100],
      ["컵·뚜껑 16oz", "EA", 1000, 120000, 100],
      ["빨대·홀더", "EA", 1000, 60000, 100],
    ],
    menus: [
      ["아메리카노", 4000, [["원두 (블렌드)", 18, "G"], ["컵·뚜껑 16oz", 1, "EA"], ["빨대·홀더", 1, "EA"]]],
      ["카페라떼", 4800, [["원두 (블렌드)", 18, "G"], ["우유 1L", 200, "ML"], ["컵·뚜껑 16oz", 1, "EA"], ["빨대·홀더", 1, "EA"]]],
      ["바닐라라떼", 5300, [["원두 (블렌드)", 18, "G"], ["우유 1L", 200, "ML"], ["바닐라시럽", 20, "ML"], ["컵·뚜껑 16oz", 1, "EA"], ["빨대·홀더", 1, "EA"]]],
      ["생딸기라떼", 6000, [["우유 1L", 200, "ML"], ["생딸기", 80, "G"], ["바닐라시럽", 15, "ML"], ["컵·뚜껑 16oz", 1, "EA"], ["빨대·홀더", 1, "EA"]]],
      ["크로플", 4500, [["크로플 생지", 1, "EA"], ["생크림", 30, "ML"]]],
    ],
    sales: [
      ["아메리카노", 1450, 220, 130],
      ["카페라떼", 520, 110, 70],
      ["바닐라라떼", 380, 140, 90],
      ["생딸기라떼", 210, 120, 80],
      ["크로플", 300, 90, 60],
    ],
    // 카페 배달은 한 주문에 여러 잔 (약 1.8잔/주문 가정)
    orders: { 배민: 380, 쿠팡: 240 },
    fixedCosts: [
      ["알바 2명 (주40h + 주말 16h)", "LABOR", FULLTIME_PARTTIMER + 950000],
      ["월세 (15평, 가정)", "RENT", 2000000],
      ["전기·수도", "UTILITIES", 450000],
      ["제빙기·정수기 렌탈, 포스, 보험", "OTHER", 350000],
    ],
    purchases: [
      ["2026-10-02", 700000, "로스터리 (원두)"],
      ["2026-10-06", 600000, "우유 대리점"],
      ["2026-10-09", 640000, "컵·빨대"],
      ["2026-10-13", 650000, "청과 (딸기)"],
      ["2026-10-16", 750000, "로스터리 (원두)"],
      ["2026-10-20", 550000, "우유 대리점"],
      ["2026-10-23", 430000, "생지·생크림"],
      ["2026-10-27", 300000, "시럽·부자재"],
    ],
    // 이상징후 데모: 우유 납품가 인상
    priceShock: ["우유 1L", 3280],
  },
  {
    email: "chinese@example.test",
    storeName: "홍반점",
    ingredients: [
      ["중화면 (생면)", "G", 1000, 3000, 100],
      ["춘장", "G", 10000, 36000, 100],
      ["돼지고기 앞다리", "G", 1000, 11000, 90],
      ["양파", "G", 1000, 2200, 90],
      ["양배추", "G", 1000, 2000, 80],
      ["오징어", "G", 1000, 16000, 75],
      ["새우 (중하, 깐새우)", "G", 1000, 18000, 100],
      ["홍합", "G", 1000, 6000, 50],
      ["짬뽕 양념 (고춧가루·두반장)", "G", 1000, 12000, 100],
      ["탕수육용 등심", "G", 1000, 14000, 95],
      ["전분", "G", 1000, 3500, 100],
      ["콩기름 18L", "ML", 18000, 62000, 100],
      ["쌀", "G", 10000, 32000, 100],
      ["계란 (30구)", "EA", 30, 7500, 100],
      ["단무지", "G", 1000, 3000, 100],
    ],
    menus: [
      ["짜장면", 7500, [["중화면 (생면)", 200, "G"], ["춘장", 40, "G"], ["돼지고기 앞다리", 30, "G"], ["양파", 80, "G"], ["양배추", 40, "G"], ["콩기름 18L", 20, "ML"], ["단무지", 30, "G"]]],
      ["짬뽕", 9000, [["중화면 (생면)", 200, "G"], ["오징어", 50, "G"], ["새우 (중하, 깐새우)", 30, "G"], ["홍합", 40, "G"], ["돼지고기 앞다리", 30, "G"], ["양배추", 40, "G"], ["양파", 30, "G"], ["짬뽕 양념 (고춧가루·두반장)", 10, "G"], ["콩기름 18L", 15, "ML"], ["단무지", 30, "G"]]],
      ["탕수육(소)", 16000, [["탕수육용 등심", 250, "G"], ["전분", 80, "G"], ["콩기름 18L", 150, "ML"], ["양파", 40, "G"], ["단무지", 50, "G"]]],
      ["볶음밥", 8500, [["쌀", 120, "G"], ["계란 (30구)", 1, "EA"], ["돼지고기 앞다리", 20, "G"], ["양파", 40, "G"], ["콩기름 18L", 20, "ML"], ["춘장", 30, "G"], ["단무지", 30, "G"]]],
    ],
    sales: [
      ["짜장면", 900, 420, 260],
      ["짬뽕", 620, 380, 210],
      ["탕수육(소)", 180, 260, 150],
      ["볶음밥", 240, 150, 90],
    ],
    // 중식 배달 약 1.6개/주문 가정
    orders: { 배민: 760, 쿠팡: 450 },
    fixedCosts: [
      ["주방장", "LABOR", 3600000],
      ["주방보조·홀 1명", "LABOR", FULLTIME_PARTTIMER],
      ["월세 (20평, 가정)", "RENT", 2200000],
      ["가스·전기·수도", "UTILITIES", 900000],
      ["포스·보험·세무", "OTHER", 400000],
    ],
    purchases: [
      ["2026-10-01", 520000, "제면소"],
      ["2026-10-04", 1350000, "정육점"],
      ["2026-10-06", 1000000, "식자재마트"],
      ["2026-10-08", 1700000, "수산시장"],
      ["2026-10-13", 1000000, "식자재마트"],
      ["2026-10-15", 500000, "제면소"],
      ["2026-10-18", 1300000, "정육점"],
      ["2026-10-20", 950000, "식자재마트"],
      ["2026-10-22", 1650000, "수산시장"],
      ["2026-10-27", 1000000, "식자재마트"],
    ],
    // 이상징후 데모: 오징어 시세 상승
    priceShock: ["오징어", 19000],
  },
];

function mondayOf(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));

  return d;
}

const iso = (d) => d.toISOString().slice(0, 10);

/** Delete the demo accounts' data directly in the DB (FKs are Restrict, so order matters). */
async function resetDemoAccounts() {
  await import("dotenv/config");

  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    for (const { email } of STORES) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { memberships: { include: { organization: { include: { stores: true } } } } },
      });

      if (!user) continue;

      for (const m of user.memberships) {
        for (const store of m.organization.stores) {
          const storeId = store.id;
          const ingredient = { ingredient: { storeId } };

          await prisma.$transaction([
            prisma.alert.deleteMany({ where: { storeId } }),
            prisma.weeklySnapshot.deleteMany({ where: { storeId } }),
            prisma.analysisRun.deleteMany({ where: { storeId } }),
            prisma.costBasisSnapshot.deleteMany({ where: { storeId } }),
            prisma.actualUsagePeriod.deleteMany({ where: { storeId } }),
            prisma.salesPeriod.deleteMany({ where: { storeId } }),
            prisma.purchaseRecord.deleteMany({ where: { storeId } }),
            prisma.fixedCostItem.deleteMany({ where: { storeId } }),
            prisma.simulationScenario.deleteMany({ where: { storeId } }),
            prisma.ingredientPriceHistory.deleteMany({ where: ingredient }),
            prisma.recipeLine.deleteMany({
              where: { OR: [{ menuItem: { storeId } }, { prepRecipe: { storeId } }] },
            }),
            prisma.menuItem.deleteMany({ where: { storeId } }),
            prisma.prepRecipe.deleteMany({ where: { storeId } }),
            prisma.ingredient.deleteMany({ where: { storeId } }),
            prisma.salesChannel.deleteMany({ where: { storeId } }),
            prisma.store.delete({ where: { id: storeId } }),
          ]);
        }

        await prisma.organization.delete({ where: { id: m.organizationId } });
      }

      await prisma.user.delete({ where: { id: user.id } });
      console.log(`- ${email}: 기존 데이터 삭제`);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function seedStore(store) {
  let cookie = "";

  async function call(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: { "content-type": "application/json", cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const setCookie = res.headers.get("set-cookie");

    if (setCookie) cookie = setCookie.split(";")[0];

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(`${method} ${path} → ${res.status} ${json?.error?.message ?? ""}`);

      err.status = res.status;
      throw err;
    }

    return json.data;
  }

  try {
    await call("POST", "/auth/register", {
      email: store.email,
      password: PASSWORD,
      storeName: store.storeName,
    });
  } catch (error) {
    if (error.status === 409) {
      console.log(`- ${store.storeName}: 이미 있는 계정이라 건너뜀 (${store.email}). --reset 으로 다시 만들 수 있음`);

      return;
    }

    throw error;
  }

  const channelId = {};

  for (const { key, ...channel } of CHANNELS) {
    channelId[key] = (await call("POST", "/channels", channel)).id;
  }

  const ingredientId = {};

  for (const [name, baseUnit, purchaseQty, purchasePrice, yieldPercent] of store.ingredients) {
    const row = await call("POST", "/ingredients", {
      name,
      baseUnit,
      purchaseQty,
      purchasePrice,
      taxType: "TAXABLE",
      yieldRate: yieldPercent / 100,
    });

    ingredientId[name] = row.id;
  }

  const menuId = {};

  for (const [name, sellingPrice, lines] of store.menus) {
    const menu = await call("POST", "/menus", { name, sellingPrice, defaultChannelId: channelId["홀"] });

    menuId[name] = menu.id;

    await call("PUT", `/menus/${menu.id}/lines`, {
      lines: lines.map(([ingredient, qty, unit]) => ({ ingredientId: ingredientId[ingredient], qty, unit })),
    });
  }

  const period = await call("POST", "/sales-periods", {
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    grain: "MONTH",
  });

  const salesLines = store.sales.flatMap(([menu, hall, baemin, coupang]) => [
    { menuItemId: menuId[menu], qty: hall, salesChannelId: channelId["홀"] },
    { menuItemId: menuId[menu], qty: baemin, salesChannelId: channelId["배민"] },
    { menuItemId: menuId[menu], qty: coupang, salesChannelId: channelId["쿠팡"] },
  ]);

  await call("PUT", `/sales-periods/${period.id}/lines`, { lines: salesLines, source: "MANUAL" });

  await call("PUT", `/sales-periods/${period.id}/order-counts`, {
    counts: Object.entries(store.orders).map(([key, orderCount]) => ({
      salesChannelId: channelId[key],
      orderCount,
    })),
  });

  for (const [name, category, monthlyAmount] of store.fixedCosts) {
    await call("POST", "/fixed-costs", { name, category, monthlyAmount });
  }

  for (const [purchasedOn, amount, supplier] of store.purchases) {
    await call("POST", "/purchases", { purchasedOn, amount, supplier });
  }

  // 주간 이상징후: 지난주 기준을 먼저 만들고, 단가를 올린 뒤 이번 주를 점검한다.
  const thisMonday = mondayOf(new Date());
  const lastMonday = new Date(thisMonday);

  lastMonday.setUTCDate(lastMonday.getUTCDate() - 7);

  await call("POST", "/weekly/run", { weekStart: iso(lastMonday) });

  const [shockName, newPrice] = store.priceShock;
  const shocked = store.ingredients.find(([name]) => name === shockName);

  await call("PATCH", `/ingredients/${ingredientId[shockName]}`, {
    purchasePrice: newPrice,
    purchaseQty: shocked[2],
  });

  const weekly = await call("POST", "/weekly/run", { weekStart: iso(thisMonday) });

  console.log(
    `- ${store.storeName}: 완료 (재료 ${store.ingredients.length}, 메뉴 ${store.menus.length}, ` +
      `판매 ${salesLines.length}줄, 알림 ${weekly.alerts?.length ?? 0}건)`,
  );
}

console.log(`대상 서버: ${BASE}`);

if (args.includes("--clean")) {
  await resetDemoAccounts();
  console.log("데모 계정 삭제만 하고 끝냄.");
  process.exit(0);
}

if (RESET) await resetDemoAccounts();

for (const store of STORES) {
  await seedStore(store);
}

console.log("끝. 계정 정보는 docs/sample-data.md 참고.");
