import Link from "next/link";
import { DataTable, Formula, H2, Note, P } from "@/components/site/prose";

export const toc = [
  { id: "ingredients", label: "아메리카노 한 잔 재료비" },
  { id: "channels", label: "매장·테이크아웃·배달 비교" },
  { id: "fixed", label: "고정비까지 넣으면" },
  { id: "checklist", label: "카페 원가율 계산 체크리스트" },
];

export default function CafeCostRate() {
  return (
    <>
      <H2 id="ingredients">아메리카노 한 잔 재료비</H2>
      <P>
        &ldquo;커피는 원가가 싸서 남는 장사&rdquo;라는 말은 재료비만 보면 맞습니다. 그런데 테이크아웃과 배달 비중이
        커지면서 음료 한 잔에 붙는 비용이 크게 늘었습니다. 아래 숫자는 계산을 보여 주기 위한 <strong>예시</strong>입니다.
      </P>
      <DataTable
        caption="아메리카노 4,500원 재료비 (예시)"
        head={["재료", "사용량", "금액"]}
        rows={[
          ["원두 (1kg 25,000원)", "18g", "450원"],
          ["물·얼음", "", "50원"],
        ]}
        foot={["재료비", "", "500원"]}
      />
      <Formula>원가율 = 500 ÷ 4,500 ≈ 11%</Formula>

      <H2 id="channels">매장·테이크아웃·배달 비교</H2>
      <DataTable
        caption="한 잔당 남는 돈 (예시 요율: 카드 1.5%, 중개 7.8%, 결제 3%, 배달비 2,900원, 부가세 별도)"
        head={["항목", "매장 (머그)", "테이크아웃", "배달 (2잔 주문 중 1잔)"]}
        rows={[
          ["재료비", "500원", "500원", "500원"],
          ["컵·뚜껑·빨대·홀더", "–", "270원", "270원"],
          ["캐리어·봉투 (1/2)", "–", "–", "75원"],
          ["결제수수료", "68원", "68원", "135원"],
          ["중개이용료", "–", "–", "351원"],
          ["배달비 (1/2)", "–", "–", "1,450원"],
        ]}
        foot={["남는 돈", "3,932원", "3,662원", "1,719원"]}
      />
      <P>
        한 잔만 배달되는 주문이라면 배달비 2,900원과 캐리어 150원이 모두 한 잔에 붙어서 남는 돈이{" "}
        <strong>194원</strong>까지 떨어집니다. 카페 배달에서 최소주문금액과 세트 구성이 중요한 이유입니다.
      </P>

      <H2 id="fixed">고정비까지 넣으면</H2>
      <P>
        카페는 재료비 비중이 낮은 대신 월세와 인건비 비중이 큽니다. 한 달 고정비 600만 원에 월 3,000잔을 판다면 한 잔에
        2,000원을 고정비로 감당해야 합니다.
      </P>
      <DataTable
        caption="고정비 한 잔 2,000원을 뺀 뒤"
        head={["", "매장", "테이크아웃", "배달 (2잔 주문)"]}
        rows={[["한 잔당", "+1,932원", "+1,662원", "−281원"]]}
      />
      <P>
        원가율 11%인 메뉴도 배달로 나가면 고정비를 메우지 못할 수 있습니다. 고정비를 감당하려면 하루에 몇 잔을 팔아야
        하는지는{" "}
        <Link href="/guides/break-even" className="font-semibold text-accent-ink underline">
          손익분기점 계산법
        </Link>
        에서 이어서 볼 수 있습니다.
      </P>

      <H2 id="checklist">카페 원가율 계산 체크리스트</H2>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-ink-soft">
        <li>
          <strong>포장재를 재료비에 넣었나</strong>: 테이크아웃 비중이 높으면 컵과 뚜껑 값이 원두 값에 가깝습니다.
        </li>
        <li>
          <strong>우유·시럽·휘핑을 ml·g 단위로 잡았나</strong>: 라떼류는 우유 값 때문에 재료비가 아메리카노의 2배 가까이
          되기도 합니다.
        </li>
        <li>
          <strong>배달은 주문 기준으로 봤나</strong>: 배달비는 잔이 아니라 주문마다 나갑니다. 주문당 평균 잔 수로 나눠야
          한 잔 이익이 맞습니다.
        </li>
      </ul>
      <Note>
        레시피에 원두, 우유, 시럽, 포장재까지 넣으면 음료별 재료비와 원가율이 바로 나옵니다.{" "}
        <Link href="/tools/menu-cost-calculator" className="font-semibold text-accent-ink underline">
          가입 없이 음료 원가 계산해 보기
        </Link>
        {" · "}
        <Link href="/guides/menu-cost-rate" className="font-semibold text-accent-ink underline">
          메뉴 원가율 계산법
        </Link>
      </Note>
    </>
  );
}
