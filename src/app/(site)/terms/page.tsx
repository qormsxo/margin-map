import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { H2, P } from "@/components/site/prose";
import { legal } from "@/lib/legal";

export const metadata: Metadata = {
  title: "이용약관",
  description: "MarginMap 서비스 이용 조건과 운영자·이용자의 권리와 책임을 안내합니다.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={[{ name: "이용약관", href: "/terms" }]} />
      <article className="mt-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-heading">이용약관</h1>
          <p className="mt-2 text-xs text-faint">시행일: {legal.effectiveDate}</p>
        </header>

        <H2 id="purpose">제1조 (목적)</H2>
        <P>
          이 약관은 {legal.operator}(이하 &ldquo;운영자&rdquo;)가 제공하는 {legal.serviceName}(이하 &ldquo;서비스&rdquo;)의
          이용 조건과 절차, 운영자와 이용자의 권리·의무를 정합니다.
        </P>

        <H2 id="service">제2조 (서비스 내용)</H2>
        <P>
          서비스는 이용자가 입력한 식재료 가격, 레시피, 판매량, 수수료, 고정비 등을 바탕으로 메뉴 원가율, 공헌이익, 영업이익,
          손익분기 매출 등을 계산해 보여 주는 도구입니다. 현재 서비스는 베타 기간으로 무료로 제공합니다. 유료 기능을
          도입할 때는 시행 30일 전에 알리며, 이용자가 동의하지 않으면 유료 기능은 적용되지 않습니다.
        </P>

        <H2 id="account">제3조 (회원가입과 계정)</H2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-ink-soft">
          <li>이용자는 이 약관과 개인정보처리방침에 동의하고 이메일·비밀번호·매장명을 입력해 가입합니다.</li>
          <li>계정과 비밀번호 관리 책임은 이용자에게 있으며, 다른 사람이 쓰게 해서는 안 됩니다.</li>
          <li>타인의 정보를 도용해 가입하면 이용을 제한할 수 있습니다.</li>
        </ul>

        <H2 id="calc">제4조 (계산 결과의 성격)</H2>
        <P>
          서비스의 계산 결과는 이용자가 입력한 값과 예시 수수료율 등에 따른 <strong>참고용 추정치</strong>입니다. 세무·회계·법률
          자문이 아니며, 실제 정산 금액·세금과 다를 수 있습니다. 가격 결정이나 신고 등 중요한 판단은 이용자가 실제 자료를
          확인해 직접 내려야 합니다.
        </P>

        <H2 id="duties">제5조 (이용자의 의무)</H2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-ink-soft">
          <li>서비스를 해킹하거나, 자동화된 방법으로 과도한 요청을 보내거나, 다른 이용자의 정보에 접근하려 해서는 안 됩니다.</li>
          <li>법령이나 이 약관을 어기면 운영자는 이용을 제한하거나 계정을 정지할 수 있습니다.</li>
        </ul>

        <H2 id="data">제6조 (입력한 정보)</H2>
        <P>
          이용자가 입력한 매장 운영 정보의 권리는 이용자에게 있습니다. 운영자는 서비스 제공 목적으로만 이 정보를 처리하며,
          자세한 내용은{" "}
          <Link href="/privacy" className="font-semibold text-accent-ink underline">
            개인정보처리방침
          </Link>
          을 따릅니다.
        </P>

        <H2 id="change">제7조 (서비스 변경과 중단)</H2>
        <P>
          운영자는 서비스 개선을 위해 기능을 바꾸거나 점검을 위해 일시 중단할 수 있습니다. 서비스를 종료할 때는 30일 전에
          알리고, 이용자가 입력한 정보를 내려받을 수 있는 방법을 안내합니다.
        </P>

        <H2 id="liability">제8조 (책임의 제한)</H2>
        <P>
          운영자는 천재지변, 이용자의 귀책 사유, 이용자가 입력한 정보의 오류로 생긴 손해에 대해 책임지지 않습니다. 무료로
          제공되는 기능에 대해서는 운영자의 고의 또는 중대한 과실이 없는 한 손해배상 책임을 지지 않습니다.
        </P>

        <H2 id="withdraw">제9조 (탈퇴)</H2>
        <P>
          이용자는 언제든지 서비스의 계정 화면에서 바로 탈퇴할 수 있으며, 탈퇴하면 계정과 입력한 정보가 즉시 삭제됩니다.
          로그인할 수 없는 경우에는 가입한 이메일로{" "}
          {legal.email ? (
            <a href={`mailto:${legal.email}`} className="font-semibold text-accent-ink underline">
              {legal.email}
            </a>
          ) : (
            "운영자"
          )}
          에 탈퇴를 요청할 수 있으며, 운영자는 지체 없이 처리합니다.
        </P>

        <H2 id="law">제10조 (준거법과 분쟁)</H2>
        <P>이 약관은 대한민국 법을 따르며, 분쟁이 생기면 민사소송법상 관할 법원에서 해결합니다.</P>

        <H2 id="terms-change">제11조 (약관 변경)</H2>
        <P>약관을 바꿀 때는 시행 7일 전(이용자에게 불리하면 30일 전)에 서비스 화면으로 알립니다.</P>
      </article>
    </div>
  );
}
