import Link from "next/link";
import { SimulationClient } from "@/components/simulation/simulation-client";

export default function SimulationPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="eyebrow uppercase">
          Simulation
        </p>
        <h1 className="text-[28px] font-bold tracking-tight text-heading">
          가격·수수료 시뮬레이션
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          판매가·식재료 단가·채널 수수료를 임시로 바꿔 공헌이익 전후를 비교합니다. 결과는
          저장 데이터에 반영되지 않습니다.
        </p>
        <Link href="/dashboard" className="text-sm text-accent-ink hover:text-accent">
          ← 대시보드
        </Link>
      </div>
      <SimulationClient />
    </div>
  );
}
