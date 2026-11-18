import Link from "next/link";
import { SimulationClient } from "@/components/simulation/simulation-client";

export default function SimulationPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-400/80">
          Simulation
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          가격·수수료 시뮬레이션
        </h1>
        <p className="max-w-2xl text-sm text-slate-400">
          판매가·식재료 단가·채널 수수료를 임시로 바꿔 공헌이익 전후를 비교합니다. 결과는
          저장 데이터에 반영되지 않습니다.
        </p>
        <Link href="/dashboard" className="text-sm text-sky-300 hover:text-sky-200">
          ← 대시보드
        </Link>
      </div>
      <SimulationClient />
    </div>
  );
}
