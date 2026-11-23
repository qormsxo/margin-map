import BreakEven, { toc as breakEvenToc } from "./break-even";
import CafeCostRate, { toc as cafeToc } from "./cafe-cost-rate";
import ChickenDeliveryMargin, { toc as chickenToc } from "./chicken-delivery-margin";
import DeliveryAppFees, { toc as deliveryToc } from "./delivery-app-fees";
import IngredientPriceRise, { toc as priceRiseToc } from "./ingredient-price-rise";
import MenuCostRate, { toc as menuCostToc } from "./menu-cost-rate";
import MenuProfitRanking, { toc as rankingToc } from "./menu-profit-ranking";

export type TocItem = { id: string; label: string };

type GuideContent = { Body: () => React.ReactElement; toc: TocItem[] };

export const GUIDE_CONTENT = new Map<string, GuideContent>([
  ["menu-cost-rate", { Body: MenuCostRate, toc: menuCostToc }],
  ["delivery-app-fees", { Body: DeliveryAppFees, toc: deliveryToc }],
  ["break-even", { Body: BreakEven, toc: breakEvenToc }],
  ["menu-profit-ranking", { Body: MenuProfitRanking, toc: rankingToc }],
  ["ingredient-price-rise", { Body: IngredientPriceRise, toc: priceRiseToc }],
  ["chicken-delivery-margin", { Body: ChickenDeliveryMargin, toc: chickenToc }],
  ["cafe-cost-rate", { Body: CafeCostRate, toc: cafeToc }],
]);
