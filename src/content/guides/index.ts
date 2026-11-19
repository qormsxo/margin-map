import BreakEven, { toc as breakEvenToc } from "./break-even";
import DeliveryAppFees, { toc as deliveryToc } from "./delivery-app-fees";
import MenuCostRate, { toc as menuCostToc } from "./menu-cost-rate";

export type TocItem = { id: string; label: string };

type GuideContent = { Body: () => React.ReactElement; toc: TocItem[] };

export const GUIDE_CONTENT = new Map<string, GuideContent>([
  ["menu-cost-rate", { Body: MenuCostRate, toc: menuCostToc }],
  ["delivery-app-fees", { Body: DeliveryAppFees, toc: deliveryToc }],
  ["break-even", { Body: BreakEven, toc: breakEvenToc }],
]);
