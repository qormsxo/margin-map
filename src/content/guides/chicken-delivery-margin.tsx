import Link from "next/link";
import { DataTable, H2, Note, P } from "@/components/site/prose";

export const toc = [
  { id: "basis", label: "계산 기준" },
  { id: "fried", label: "후라이드 한 마리: 홀 vs 배달" },
  { id: "seasoned", label: "양념 한 마리: 비싸도 차이는 더 커진다" },
  { id: "monthly", label: "한 달로 보면" },
  { id: "use", label: "이 차이로 판단할 것들" },
];

export default function ChickenDeliveryMargin() {
  return (
    <>
      <H2 id="basis">계산 기준</H2>
      <P>
        치킨은 배달 비중이 가장 높은 업종 중 하나입니다. 판매가가 2만 원대라 한 마리 팔면 꽤 남을 것 같지만, 채널에 따라
        남는 돈이 크게 갈립니다. 아래 숫자는 계산을 보여 주기 위한 <strong>예시</strong>입니다.
      </P>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-ink-soft">
        <li>후라이드 21,000원, 재료비 9,000원 (생닭, 튀김유, 파우더, 포장재, 치킨무, 콜라 포함)</li>
        <li>양념 23,000원, 재료비 10,000원</li>
        <li>홀: 카드수수료 1.5%</li>
        <li>배달앱: 중개이용료 7.8%, 결제수수료 3%, 가게 부담 배달비 2,900원 (부가세 별도)</li>
      </ul>

      <H2 id="fried">후라이드 한 마리: 홀 vs 배달</H2>
      <DataTable
        caption="후라이드 21,000원 1마리 (예시 요율)"
        head={["항목", "홀", "배달앱"]}
        rows={[
          ["판매가", "21,000원", "21,000원"],
          ["재료비", "−9,000원", "−9,000원"],
          ["결제수수료", "−315원", "−630원"],
          ["중개이용료", "–", "−1,638원"],
          ["가게 부담 배달비", "–", "−2,900원"],
        ]}
        foot={["남는 돈", "11,685원", "6,832원"]}
      />
      <P>
        같은 치킨인데 한 마리에 <strong>4,853원</strong> 차이가 납니다. 배달로 팔면 판매가의 32.5%만 남습니다.
      </P>

      <H2 id="seasoned">양념 한 마리: 비싸도 차이는 더 커진다</H2>
      <DataTable
        caption="양념 23,000원 1마리 (예시 요율)"
        head={["항목", "홀", "배달앱"]}
        rows={[
          ["재료비", "−10,000원", "−10,000원"],
          ["결제수수료", "−345원", "−690원"],
          ["중개이용료", "–", "−1,794원"],
          ["가게 부담 배달비", "–", "−2,900원"],
        ]}
        foot={["남는 돈", "12,655원", "7,616원"]}
      />
      <P>
        판매가가 2,000원 높아도 홀과 배달의 차이는 5,039원으로 오히려 더 벌어집니다. 중개이용료와 결제수수료는 판매가에
        비례해서 붙기 때문입니다.
      </P>

      <H2 id="monthly">한 달로 보면</H2>
      <P>
        후라이드가 배달로 한 달에 400마리 나간다면, 같은 주문을 홀에서 받았을 때보다 4,853원 × 400 ={" "}
        <strong>약 194만 원</strong>이 덜 남습니다. 배달은 홀에서 받을 수 없는 주문을 더해 주는 매출이니 손해라는 뜻은
        아닙니다. 다만 이 차이를 알고 있어야 가격과 구성을 숫자로 정할 수 있습니다.
      </P>

      <H2 id="use">이 차이로 판단할 것들</H2>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-ink-soft">
        <li>
          <strong>배달 전용 가격</strong>: 홀보다 얼마를 더 받아야 배달 1마리가 목표 이익을 남기는지
        </li>
        <li>
          <strong>포장 할인 폭</strong>: 배달 대비 아끼는 배달비와 수수료 안에서 할인을 정하기
        </li>
        <li>
          <strong>사이드 메뉴 구성</strong>: 주문 금액이 커지면 배달비 2,900원이 차지하는 비중이 줄어듭니다
        </li>
      </ul>
      <Note>
        배달 주문 하나에서 빠지는 항목과 정산명세서로 내 가게의 실제 수수료율을 구하는 방법은{" "}
        <Link href="/guides/delivery-app-fees" className="font-semibold text-accent-ink underline">
          배달앱 수수료 계산법
        </Link>
        에 정리해 두었습니다.
      </Note>
    </>
  );
}
