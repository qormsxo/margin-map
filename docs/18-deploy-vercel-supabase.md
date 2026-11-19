# 18. 배포 — Vercel + Supabase

앱(화면과 API)은 Vercel 하나에 올라가고, DB만 Supabase를 씁니다. 별도의 백엔드 서버는 없습니다.

## 1. Supabase 프로젝트 만들기

1. **New project**를 만듭니다.
   - **Region:** `Northeast Asia (Seoul)`
   - **Database password:** 따로 저장해 둡니다.
2. 프로젝트 화면 위쪽 **Connect → ORMs 탭 → Prisma**를 고릅니다. (처음 보이는 App Frameworks 탭의 `NEXT_PUBLIC_SUPABASE_*` 값은 supabase-js용이라 쓰지 않습니다.)
   - `DATABASE_URL` (포트 6543, `?pgbouncer=true`) → 그대로 사용
   - `DIRECT_URL` (포트 5432) → 끝에 `?sslmode=require`를 붙입니다.
3. 주소 안의 `[YOUR-PASSWORD]`는 1번에서 정한 비밀번호로 바꿉니다.

`DATABASE_URL`에는 `sslmode`를 붙이지 않습니다. 앱이 코드에서 TLS를 켭니다 (`src/lib/prisma.ts`).

## 2. 테이블 만들기

> 현재 프로젝트(서울, `ikkraizfonomflswzuod`)는 2026-11-19에 마이그레이션 4개가 적용돼 있고 `_prisma_migrations`에도 기록돼 있습니다. 다음 스키마 변경부터 아래 명령을 씁니다.

또, Supabase는 `public` 테이블을 공개 REST API로 노출하므로 모든 테이블에 RLS를 켜고 `anon`/`authenticated` 권한을 빼 두었습니다. 앱은 테이블 소유자(postgres)로 접속해 영향이 없습니다. 새 테이블은 기본 권한에서 빠지지만, 마이그레이션 후 Supabase **Advisors**에서 경고가 없는지 한 번 확인합니다.


PowerShell:

```powershell
$env:DIRECT_URL="<Session pooler 주소>?sslmode=require"; npm run db:deploy
```

`prisma/migrations`의 마이그레이션이 Supabase에 순서대로 적용됩니다. 스키마가 바뀔 때마다 이 명령을 다시 실행합니다.

## 3. Vercel 프로젝트

1. 저장소를 GitHub에 올립니다.
2. Vercel에서 **Add New → Project**로 그 저장소를 가져옵니다. Framework는 Next.js로 자동 인식됩니다.
3. **Settings → Environment Variables**에 아래 값을 넣습니다 (Production).

| 이름 | 값 |
|------|----|
| `DATABASE_URL` | Transaction pooler 주소 (6543) |
| `DIRECT_URL` | Session pooler 주소 (5432) + `?sslmode=require` |
| `AUTH_SECRET` | 32자 이상 무작위 문자열. 만드는 법: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | 배포 주소. 예: `https://marginmap.vercel.app` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | 비밀번호 문의를 받을 이메일 |

4. **Deploy**를 누릅니다. 빌드할 때 `postinstall`이 Prisma Client를 생성합니다.

`vercel.json`에 두 가지가 미리 설정돼 있습니다.

- **함수 리전 서울(`icn1`):** DB와 같은 지역이라 화면이 빠릅니다.
- **하루 한 번 `/api/v1/health` 호출 (03:00 KST):** Supabase 무료 프로젝트는 7일 동안 아무도 안 쓰면 일시정지되는데, 이 호출이 그걸 막습니다.

## 4. 배포 후 확인

- `https://<주소>/api/v1/health`가 `"database": "up"`을 돌려주는지 봅니다.
- 휴대폰으로 접속해 가입 → 업종 선택 → 식재료 칩 → 메뉴까지 해 봅니다.
- 휴대폰 브라우저 메뉴에서 **홈 화면에 추가**가 되는지 봅니다.

## 운영 중에 쓰는 것

**백업.** Supabase 무료 플랜은 백업을 내려받을 수 없습니다. 주 1회 정도 내 PC에서 JSON으로 떠 둡니다. 파일은 `backups/`에 저장되고, git에는 올라가지 않습니다.

```powershell
$env:DIRECT_URL="<Session pooler 주소>"; npm run db:backup
```

**비밀번호 분실.** 사장님이 이메일과 매장명을 보내 오면 새 비밀번호를 정해 알려 줍니다. 매장 데이터는 그대로 남습니다.

```powershell
$env:DATABASE_URL="<Session pooler 주소>"; node scripts/reset-password.mjs --email <이메일> --password <새 비밀번호>
```

**데이터 초기화.** `scripts/reset-data.mjs`는 로컬 DB가 아니면 멈춥니다. 운영 DB에는 실행하지 않습니다.

**돈을 받기 시작하면.** Vercel Hobby는 비상업용이라 Pro로 올려야 합니다.
