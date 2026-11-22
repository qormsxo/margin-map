import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { DataTable, H2, P } from "@/components/site/prose";
import { legal } from "@/lib/legal";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "MarginMap이 어떤 개인정보를 왜 받고, 얼마나 보관하며, 어떻게 지우는지 안내합니다.",
  alternates: { canonical: "/privacy" },
};

function Contact() {
  return legal.email ? (
    <a href={`mailto:${legal.email}`} className="font-semibold text-accent-ink underline">
      {legal.email}
    </a>
  ) : (
    <span>서비스 내 문의 안내</span>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={[{ name: "개인정보처리방침", href: "/privacy" }]} />
      <article className="mt-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-heading">개인정보처리방침</h1>
          <p className="mt-3 text-sm text-muted">
            {legal.serviceName}(이하 &ldquo;서비스&rdquo;)를 운영하는 {legal.operator}(이하 &ldquo;운영자&rdquo;)는
            「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 관련 고충을 신속하게 처리하기 위해 다음과 같이
            개인정보처리방침을 둡니다.
          </p>
          <p className="mt-2 text-xs text-faint">시행일: {legal.effectiveDate}</p>
        </header>

        <H2 id="items">1. 처리하는 개인정보 항목</H2>
        <DataTable
          caption="수집 항목과 방법"
          head={["구분", "항목", "수집 방법"]}
          rows={[
            ["필수", "이메일 주소, 비밀번호(암호화 저장), 매장명", "회원가입 시 이용자가 직접 입력"],
            ["서비스 이용 중 생성", "업종, 식재료·메뉴·레시피·판매량·고정비·매입 등 이용자가 입력한 매장 운영 정보", "이용자가 직접 입력"],
            ["자동 생성", "로그인 유지를 위한 세션 쿠키, 접속 IP(로그인 시도 제한 목적), 서비스 이용 기록", "서비스 이용 과정에서 자동 생성"],
          ]}
        />
        <P>운영자는 주민등록번호, 계좌·카드번호 등 민감하거나 금융과 관련된 정보는 받지 않습니다.</P>

        <H2 id="purpose">2. 처리 목적</H2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-ink-soft">
          <li>회원 식별, 로그인 유지, 부정 이용(비밀번호 무작위 대입 등) 방지</li>
          <li>이용자가 입력한 정보로 메뉴 원가·공헌이익·영업이익 등을 계산해 보여 주는 서비스 제공</li>
          <li>비밀번호 재설정 등 문의 응대와 서비스 관련 공지</li>
        </ul>
        <P>이용자가 입력한 매장 운영 정보는 해당 계정에서만 보이며, 광고나 다른 목적으로 쓰지 않습니다.</P>

        <H2 id="retention">3. 보유 및 이용 기간</H2>
        <P>
          회원 탈퇴 시 계정과 매장 운영 정보를 즉시 모두 파기합니다. 로그인·가입 시도 기록(이메일, 접속 IP)은 하루가
          지나면 자동으로 삭제합니다. 관계 법령에 따라 보존해야 하는 정보가 생기면 그 기간 동안만
          분리해 보관합니다.
        </P>

        <H2 id="third-party">4. 제3자 제공</H2>
        <P>운영자는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 법령에 근거가 있는 경우는 예외로 합니다.</P>

        <H2 id="outsourcing">5. 처리 위탁</H2>
        <P>서비스 운영을 위해 다음 업체에 개인정보 처리를 맡기고 있습니다.</P>
        <DataTable
          caption="수탁자와 위탁 업무"
          head={["수탁자", "위탁 업무", "처리 위치"]}
          rows={[
            ["Vercel Inc.", "웹 서비스 호스팅", "대한민국 서울 리전 서버에서 처리"],
            ["Supabase Inc.", "데이터베이스 저장·백업", "대한민국 서울 리전(ap-northeast-2)에 저장"],
          ]}
        />
        <P>수탁 업체가 바뀌면 이 방침을 고쳐 알립니다.</P>

        <H2 id="destroy">6. 파기 절차와 방법</H2>
        <P>
          보유 기간이 끝났거나 처리 목적을 이룬 개인정보는 지체 없이 파기합니다. 데이터베이스에 저장된 정보는 복구할 수
          없는 방법으로 삭제합니다.
        </P>

        <H2 id="rights">7. 이용자의 권리와 행사 방법</H2>
        <P>
          이용자는 언제든지 서비스의 <strong>계정</strong> 화면에서 비밀번호와 매장 이름을 확인한 뒤 바로 탈퇴할 수 있으며,
          탈퇴하면 계정과 매장의 모든 기록이 즉시 삭제됩니다. 입력한 정보는 각 화면에서 직접 열람·정정·삭제할 수 있습니다.
        </P>
        <P>
          그 밖에 개인정보 열람, 정정, 삭제, 처리 정지를 원하거나 로그인할 수 없는 경우에는 가입한 이메일로 <Contact />에
          요청하면 본인 확인 후 지체 없이 처리합니다.
        </P>

        <H2 id="security">8. 안전성 확보 조치</H2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-ink-soft">
          <li>비밀번호는 복호화할 수 없는 방식(bcrypt)으로만 저장</li>
          <li>모든 통신은 HTTPS로 암호화, 데이터베이스 연결도 암호화</li>
          <li>로그인 시도 횟수 제한으로 무작위 대입 방지</li>
          <li>데이터베이스 접근 권한을 운영자로 제한하고, 외부 공개 API 접근 차단</li>
        </ul>

        <H2 id="cookies">9. 쿠키</H2>
        <P>
          로그인 상태를 유지하기 위해 세션 쿠키 1개를 사용합니다(유효기간 14일). 광고·추적용 쿠키는 쓰지 않습니다.
          브라우저 설정에서 쿠키를 막을 수 있지만, 그러면 로그인이 필요한 기능을 쓸 수 없습니다.
        </P>

        <H2 id="officer">10. 개인정보 보호책임자</H2>
        <P>
          개인정보 보호책임자: {legal.operator} · 연락처: <Contact />
        </P>
        <P>
          개인정보 침해에 대한 신고나 상담은 개인정보침해신고센터(privacy.kisa.or.kr, 국번 없이 118), 개인정보분쟁조정위원회
          (kopico.go.kr, 1833-6972)에도 할 수 있습니다.
        </P>

        <H2 id="changes">11. 방침 변경</H2>
        <P>이 방침이 바뀌면 시행 7일 전에 서비스 화면으로 알립니다. 이용자에게 불리한 변경은 30일 전에 알립니다.</P>
      </article>
    </div>
  );
}
