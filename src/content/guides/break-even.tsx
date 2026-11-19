import Link from "next/link";
import { DataTable, Formula, H2, Note, P } from "@/components/site/prose";

export const toc = [
  { id: "what", label: "손익분기점이란" },
  { id: "contribution", label: "먼저 공헌이익률 구하기" },
  { id: "example", label: "한 달·하루 손익분기 매출 예시" },
  { id: "safety", label: "안전한계율로 여유 보기" },
  { id: "levers", label: "손익분기점을 낮추는 방법" },
];

export default function BreakEven() {
  return (
    <>
      <H2 id="what">손익분기점이란</H2>
      <P>
        손익분기점은 <strong>번 돈과 쓴 돈이 같아지는 매출</strong>입니다. 이 매출보다 많이 팔면 남고, 적게 팔면
        손해입니다. 식당에서는 &ldquo;한 달에 얼마, 하루에 얼마 팔아야 본전인가&rdquo;로 생각하면 쉽습니다.
      </P>

      <H2 id="contribution">먼저 공헌이익률 구하기</H2>
      <P>
        매출에서 재료비와 수수료처럼 <strong>팔 때마다 나가는 돈</strong>을 빼고 남는 것이 공헌이익입니다. 이 돈으로
        인건비·월세 같은 고정비를 갚고, 그러고도 남으면 영업이익이 됩니다.
      </P>
      <Formula>공헌이익률 = (매출 − 재료비 − 수수료·배달비) ÷ 매출</Formula>
      <P>
        예를 들어 한 달 매출 2,600만 원에서 재료비와 수수료로 1,430만 원이 나갔다면 공헌이익은 1,170만 원, 공헌이익률은
        45%입니다.
      </P>

      <H2 id="example">한 달·하루 손익분기 매출 예시</H2>
      <Formula>손익분기 매출 = 월 고정비 ÷ 공헌이익률</Formula>
      <DataTable
        caption="월 고정비 (예시)"
        head={["항목", "월 금액"]}
        rows={[
          ["인건비", "5,000,000원"],
          ["월세", "2,500,000원"],
          ["공과금·통신·기타", "1,500,000원"],
        ]}
        foot={["합계", "9,000,000원"]}
      />
      <P>
        고정비 900만 원 ÷ 공헌이익률 45% = <strong>한 달 손익분기 매출 2,000만 원</strong>입니다. 30일 영업이라면 하루
        약 66만 7천 원 이상 팔아야 남는 장사입니다.
      </P>
      <P>
        실제 매출이 2,600만 원이면 영업이익은 2,600만 × 45% − 900만 = <strong>270만 원</strong>입니다. 세금과 대출
        이자는 이 계산에 들어 있지 않습니다.
      </P>

      <H2 id="safety">안전한계율로 여유 보기</H2>
      <Formula>안전한계율 = (실제 매출 − 손익분기 매출) ÷ 실제 매출</Formula>
      <P>
        위 예시는 (2,600만 − 2,000만) ÷ 2,600만 = <strong>23.1%</strong>입니다. 매출이 23% 넘게 줄면 적자로 돌아선다는
        뜻입니다. 이 숫자가 작을수록 비수기나 재료값 인상에 약한 가게입니다.
      </P>

      <H2 id="levers">손익분기점을 낮추는 방법</H2>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-ink-soft">
        <li>
          <strong>공헌이익률 올리기</strong>: 원가율 높은 메뉴의 가격·양 조정, 남는 돈이 큰 메뉴를 더 많이 팔기
        </li>
        <li>
          <strong>채널 구성 바꾸기</strong>: 수수료가 큰 배달 비중이 높으면 같은 매출이라도 공헌이익률이 낮아집니다
        </li>
        <li>
          <strong>고정비 줄이기</strong>: 바쁜 시간대에 맞춘 인력 배치 등
        </li>
      </ul>
      <Note>
        MarginMap에 메뉴·레시피, 채널별 판매량, 월 고정비를 넣으면 이번 달 영업이익, 손익분기 매출, 하루 목표 매출,
        안전한계율이 자동으로 계산됩니다.{" "}
        <Link href="/login?mode=register" className="font-semibold text-accent-ink underline">
          무료로 시작하기
        </Link>
      </Note>
    </>
  );
}
