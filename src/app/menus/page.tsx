"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  RecipeEditor,
  type RecipeIngredient,
  type RecipeLine,
  type RecipePrep,
} from "@/components/menus/recipe-editor";
import { StatusBanner } from "@/components/ui/status-banner";
import { apiFetch } from "@/lib/client-api";
import { parseAmount } from "@/lib/parse-amount";
import { useNumericInputMode } from "@/lib/use-numeric-input-mode";

type Menu = {
  id: string;
  name: string;
  sellingPrice: number;
  vatInclusive: boolean;
  isActive: boolean;
  lines: RecipeLine[];
};

type Costing = {
  ingredientCost: number;
  contribution: number;
  contributionMargin: number | null;
};

const won = (v: number) => `${Math.round(v).toLocaleString("ko-KR")}원`;

export default function MenusPage() {
  const inputModes = useNumericInputMode();
  const [items, setItems] = useState<Menu[]>([]);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [preps, setPreps] = useState<RecipePrep[]>([]);
  const [costing, setCosting] = useState<Record<string, Costing>>({});
  const [costingNote, setCostingNote] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);

    const [menus, ings, prepRes] = await Promise.all([
      apiFetch<Menu[]>("/api/v1/menus"),
      apiFetch<RecipeIngredient[]>("/api/v1/ingredients"),
      apiFetch<RecipePrep[]>("/api/v1/prep-recipes"),
    ]);

    setLoading(false);

    if (!menus.ok) {
      setError(menus.status === 401 ? "로그인이 필요합니다." : menus.message);
      setItems([]);

      return;
    }

    setItems(menus.data);

    if (ings.ok) setIngredients(ings.data);

    if (prepRes.ok) setPreps(prepRes.data);

    const next: Record<string, Costing> = {};
    const notes: Record<string, string> = {};

    await Promise.all(
      menus.data.map(async (menu) => {
        if (menu.lines.length === 0) return;

        const cost = await apiFetch<Costing>(`/api/v1/menus/${menu.id}/costing`);

        if (cost.ok) next[menu.id] = cost.data;
        else notes[menu.id] = cost.message;
      }),
    );

    setCosting(next);
    setCostingNote(notes);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy(true);
    setError(null);

    const result = await apiFetch<Menu>("/api/v1/menus", {
      method: "POST",
      body: JSON.stringify({
        name,
        sellingPrice: parseAmount(price),
        vatInclusive: true,
      }),
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    setName("");
    setPrice("");
    await load();
    // Go straight to the recipe for the new menu.
    setEditingId(result.data.id);
  }

  const withoutRecipe = items.filter((m) => m.lines.length === 0).length;

  // Every menu fails costing the same way when there is no sales channel: say it once.
  const noChannel = Object.values(costingNote).some((note) => note.includes("판매 채널이 없습니다"));

  /** Ingredient cost from the recipe alone (null if it uses a prep, which needs the server). */
  const localCost = (lines: RecipeLine[]) => {
    let sum = 0;

    for (const line of lines) {
      const ing = ingredients.find((i) => i.id === line.ingredientId);

      if (line.componentType !== "INGREDIENT" || !ing) return null;

      sum += line.qty * ing.effectiveUnitCost;
    }

    return sum;
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-400/80">Menus</p>
        <h1 className="text-3xl font-semibold text-white">메뉴와 레시피</h1>
        <p className="text-sm text-slate-400">
          메뉴마다 어떤 재료가 얼마나 들어가는지 넣으면 재료비와 1개 팔 때 남는 돈이 나옵니다.
        </p>
      </header>

      {loading ? <StatusBanner kind="loading" message="불러오는 중…" /> : null}
      {error ? <StatusBanner kind="error" message={error} /> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();

          if (name.trim() && (parseAmount(price) ?? 0) > 0 && !busy) void create();
        }}
        className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4"
      >
        <h2 className="text-sm font-medium text-slate-200">새 메뉴</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="메뉴명"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="판매가 (원)"
            inputMode={inputModes.numeric}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !name.trim() || !((parseAmount(price) ?? 0) > 0)}
          className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-40"
        >
          추가하고 레시피 넣기 (Enter)
        </button>
      </form>

      {noChannel ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-sky-500/30 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
          남는 돈은 어디서 파는지(홀·배민 등)를 정하면 나옵니다.
          <Link href="/sales" className="text-sky-300">
            판매 채널 추가 →
          </Link>
        </div>
      ) : null}

      {withoutRecipe > 0 ? (
        <p className="text-sm text-amber-300">레시피가 없는 메뉴 {withoutRecipe}개</p>
      ) : null}

      <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
        {items.map((item) => {
          const c = costing[item.id];
          const editing = editingId === item.id;
          const hasRecipe = item.lines.length > 0;

          return (
            <li key={item.id} className="bg-slate-900/40 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-medium text-slate-100">{item.name}</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-sm text-slate-300">{won(item.sellingPrice)}</span>
                  {!editing ? (
                    <button
                      type="button"
                      onClick={() => setEditingId(item.id)}
                      className={`text-xs ${hasRecipe ? "text-sky-300" : "rounded bg-amber-400/15 px-2 py-0.5 text-amber-200"}`}
                    >
                      {hasRecipe ? "레시피 수정" : "레시피 넣기"}
                    </button>
                  ) : null}
                </div>
              </div>

              {!editing ? (
                c ? (
                  <div className="mt-1 text-xs text-slate-500">
                    재료 {item.lines.length}가지 · 재료비 {won(c.ingredientCost)} · 남는 돈{" "}
                    {won(c.contribution)}
                    {c.contributionMargin !== null
                      ? ` · 마진율 ${(c.contributionMargin * 100).toFixed(1)}%`
                      : ""}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-slate-600">
                    {!hasRecipe ? (
                      "레시피를 넣으면 재료비와 남는 돈이 표시됩니다."
                    ) : (
                      <>
                        {localCost(item.lines) !== null ? (
                          <span className="text-slate-500">
                            재료 {item.lines.length}가지 · 재료비 {won(localCost(item.lines) ?? 0)}
                          </span>
                        ) : null}
                        {costingNote[item.id] && !noChannel ? ` · ${costingNote[item.id]}` : null}
                      </>
                    )}
                  </div>
                )
              ) : (
                <RecipeEditor
                  menuId={item.id}
                  sellingPrice={item.sellingPrice}
                  lines={item.lines}
                  ingredients={ingredients}
                  preps={preps}
                  otherMenus={items.filter((m) => m.id !== item.id && m.lines.length > 0)}
                  onCancel={() => setEditingId(null)}
                  onSaved={async () => {
                    setEditingId(null);
                    await load();
                  }}
                />
              )}
            </li>
          );
        })}
        {!loading && items.length === 0 && !error ? (
          <li className="px-4 py-6 text-sm text-slate-500">메뉴가 없습니다.</li>
        ) : null}
      </ul>

      <Link href="/dashboard" className="text-sm text-sky-300">
        ← 대시보드
      </Link>
    </div>
  );
}
