import { DashboardView } from "@/components/dashboard/dashboard-view";
import { EmptyPanel } from "@/components/dashboard/empty-panel";
import { SetupChecklist, isSetupComplete } from "@/components/dashboard/setup-checklist";
import { AppError } from "@/lib/errors";
import { getIntegratedDashboard } from "@/server/dashboard-service";
import { getSetupStatus } from "@/server/store-service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const status = await getSetupStatus();
    const checklist = isSetupComplete(status) ? null : <SetupChecklist status={status} />;

    // Profit numbers need at least one sales channel (fees). Until then, only guide setup.
    if (status.channels === 0) {
      return (
        <div className="space-y-6">
          <header className="space-y-2">
            <p className="eyebrow">환영합니다</p>
            <h1 className="text-[28px] font-bold tracking-tight text-heading">6단계만 채우면 끝</h1>
            <p className="max-w-lg text-sm leading-relaxed text-muted">
              아래 순서대로 입력하면 메뉴별로 얼마 남는지, 이번 달 실제로 얼마 남았는지가 여기에
              나옵니다.
            </p>
          </header>
          {checklist}
        </div>
      );
    }

    const data = await getIntegratedDashboard();

    return (
      <div className="space-y-6">
        {checklist}
        <DashboardView data={data} />
      </div>
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      return (
        <EmptyPanel
          title="대시보드"
          message="로그인하면 내 매장 대시보드를 볼 수 있습니다."
          action={{ href: "/login", label: "로그인" }}
        />
      );
    }

    throw error;
  }
}
