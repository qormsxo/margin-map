"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { parseAmount } from "@/lib/parse-amount";
import { useNumericInputMode } from "@/lib/use-numeric-input-mode";

type Unit = "G" | "ML" | "EA";

export type RecipeIngredient = {
  id: string;
  name: string;
  baseUnit: Unit;
  effectiveUnitCost: number;
};

export type RecipePrep = { id: string; name: string; yieldUnit: Unit };

export type RecipeSource = { id: string; name: string; lines: RecipeLine[] };

export type RecipeLine = {
  componentType: "INGREDIENT" | "PREP";
  ingredientId: string | null;
  componentPrepId: string | null;
  qty: number;
  unit: Unit;
};

type Row = { key: string; ref: string; qty: string };

const UNIT_LABEL: Record<Unit, string> = { G: "g", ML: "ml", EA: "개" };

const won = (v: number) => `${Math.round(v).toLocaleString("ko-KR")}원`;

let rowSeq = 0;
const newKey = () => `row-${(rowSeq += 1)}`;

/** Ref values are prefixed so one select can hold ingredients and preps. */
const ingredientRef = (id: string) => `i:${id}`;
const prepRef = (id: string) => `p:${id}`;

export function RecipeEditor({
  menuId,
  sellingPrice,
  lines,
  ingredients,
  preps,
  otherMenus,
  onSaved,
  onCancel,
}: {
  menuId: string;
  sellingPrice: number;
  lines: RecipeLine[];
  ingredients: RecipeIngredient[];
  preps: RecipePrep[];
  /** Menus whose recipe can be copied in as a starting point. */
  otherMenus: RecipeSource[];
  onSaved: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const inputModes = useNumericInputMode();

  const toRows = (source: RecipeLine[]): Row[] =>
    source.map((line) => ({
      key: newKey(),
      ref:
        line.componentType === "PREP" && line.componentPrepId
          ? prepRef(line.componentPrepId)
          : ingredientRef(line.ingredientId ?? ""),
      qty: String(line.qty),
    }));

  const [rows, setRows] = useState<Row[]>(() => {
    const initial = toRows(lines);

    return initial.length > 0 ? initial : [{ key: newKey(), ref: "", qty: "" }];
  });

  const selectRefs = useRef(new Map<string, HTMLSelectElement>());
  const [focusKey, setFocusKey] = useState<string | null>(null);

  useEffect(() => {
    if (!focusKey) return;

    selectRefs.current.get(focusKey)?.focus();
    setFocusKey(null);
  }, [focusKey, rows]);

  function addRow() {
    const key = newKey();

    setRows((list) => [...list, { key, ref: "", qty: "" }]);
    setFocusKey(key);
  }

  /** Copy another menu's recipe in. Lines already present are kept as they are. */
  function copyFrom(menuId: string) {
    const source = otherMenus.find((m) => m.id === menuId);

    if (!source) return;

    setRows((list) => {
      const kept = list.filter((r) => r.ref !== "" || r.qty.trim() !== "");
      const have = new Set(kept.map((r) => r.ref));
      const added = toRows(source.lines).filter((r) => !have.has(r.ref));

      return [...kept, ...added];
    });
  }

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingredientById = useMemo(
    () => new Map(ingredients.map((i) => [i.id, i] as const)),
    [ingredients],
  );

  const prepById = useMemo(() => new Map(preps.map((p) => [p.id, p] as const)), [preps]);

  function describe(ref: string) {
    if (ref.startsWith("i:")) {
      const ing = ingredientById.get(ref.slice(2));

      return ing ? { unit: ing.baseUnit, unitCost: ing.effectiveUnitCost } : null;
    }

    if (ref.startsWith("p:")) {
      const prep = prepById.get(ref.slice(2));

      return prep ? { unit: prep.yieldUnit, unitCost: null } : null;
    }

    return null;
  }

  const lineCost = (row: Row) => {
    const info = describe(row.ref);
    const qty = parseAmount(row.qty) ?? 0;

    if (!info || info.unitCost === null || !(qty > 0)) return null;

    return qty * info.unitCost;
  };

  const total = rows.reduce((sum, row) => sum + (lineCost(row) ?? 0), 0);
  const hasPrep = rows.some((row) => row.ref.startsWith("p:"));
  const usedRefs = new Set(rows.map((r) => r.ref));
  const qtyOf = (row: Row) => parseAmount(row.qty) ?? 0;
  const filled = rows.filter((row) => row.ref && qtyOf(row) > 0);

  const incomplete = rows.some(
    (row) => (row.ref === "") !== (row.qty.trim() === "") || (row.qty.trim() !== "" && !(qtyOf(row) > 0)),
  );

  function update(key: string, patch: Partial<Row>) {
    setRows((list) => list.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function save() {
    setBusy(true);
    setError(null);

    const body = filled.map((row) => {
      const info = describe(row.ref)!;
      const id = row.ref.slice(2);

      return row.ref.startsWith("i:")
        ? { ingredientId: id, qty: qtyOf(row), unit: info.unit }
        : { componentPrepId: id, qty: qtyOf(row), unit: info.unit };
    });

    const res = await apiFetch(`/api/v1/menus/${menuId}/lines`, {
      method: "PUT",
      body: JSON.stringify({ lines: body }),
    });

    setBusy(false);

    if (!res.ok) {
      setError(res.message);

      return;
    }

    await onSaved();
  }

  const input = "rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-sm";

  if (ingredients.length === 0 && preps.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-line-strong p-3 text-sm text-muted">
        식재료를 먼저 등록해야 레시피를 만들 수 있습니다.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-line-strong bg-canvas p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-faint">
          메뉴 1개에 들어가는 재료와 양(손질 후)을 넣으세요. 양 칸에서 Enter를 누르면 다음 줄로 갑니다.
        </p>
        {otherMenus.length > 0 ? (
          <select
            aria-label="다른 메뉴 레시피 가져오기"
            className="rounded-lg border border-line-strong bg-surface px-2 py-1 text-xs text-ink-soft"
            value=""
            onChange={(e) => copyFrom(e.target.value)}
          >
            <option value="">다른 메뉴 레시피 가져오기…</option>
            {otherMenus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.lines.length}가지)
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <ul className="space-y-2">
        {rows.map((row) => {
          const info = describe(row.ref);
          const cost = lineCost(row);

          return (
            <li key={row.key} className="grid grid-cols-[1fr_6rem_2rem] items-center gap-2 sm:grid-cols-[1fr_7rem_2.5rem_6rem_2rem]">
              <select
                aria-label="재료"
                ref={(el) => {
                  if (el) selectRefs.current.set(row.key, el);
                  else selectRefs.current.delete(row.key);
                }}
                className={input}
                value={row.ref}
                onChange={(e) => update(row.key, { ref: e.target.value })}
              >
                <option value="">재료 선택</option>
                {ingredients.map((ing) => (
                  <option
                    key={ing.id}
                    value={ingredientRef(ing.id)}
                    disabled={usedRefs.has(ingredientRef(ing.id)) && row.ref !== ingredientRef(ing.id)}
                  >
                    {ing.name}
                  </option>
                ))}
                {preps.length > 0 ? (
                  <optgroup label="직접 만든 반제품">
                    {preps.map((prep) => (
                      <option
                        key={prep.id}
                        value={prepRef(prep.id)}
                        disabled={usedRefs.has(prepRef(prep.id)) && row.ref !== prepRef(prep.id)}
                      >
                        {prep.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
              <input
                aria-label="양"
                className={`${input} text-right`}
                inputMode={inputModes.decimal}
                placeholder="양"
                value={row.qty}
                onChange={(e) => update(row.key, { qty: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;

                  e.preventDefault();

                  const index = rows.findIndex((r) => r.key === row.key);
                  const next = rows[index + 1];

                  if (next) setFocusKey(next.key);
                  else addRow();
                }}
              />
              <span className="hidden text-sm text-muted sm:inline">
                {info ? UNIT_LABEL[info.unit] : ""}
              </span>
              <span className="hidden text-right text-sm text-ink-soft sm:inline">
                {cost === null ? (info && info.unitCost === null ? "저장 후 계산" : "") : won(cost)}
              </span>
              <button
                type="button"
                aria-label="이 재료 빼기"
                onClick={() => setRows((list) => (list.length > 1 ? list.filter((r) => r.key !== row.key) : [{ key: newKey(), ref: "", qty: "" }]))}
                className="text-lg leading-none text-faint hover:text-loss"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={addRow}
        className="text-sm text-accent-ink"
      >
        + 재료 추가
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
        <span className="text-ink-soft">
          재료비 {won(total)}
          {hasPrep ? " + 반제품" : ""}
          {sellingPrice > 0 && !hasPrep ? (
            <span className="ml-2 text-faint">(판매가의 {((total / sellingPrice) * 100).toFixed(1)}%)</span>
          ) : null}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-muted hover:text-ink">
            취소
          </button>
          <button
            type="button"
            disabled={busy || incomplete}
            onClick={() => void save()}
            className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white shadow-sm shadow-accent/20 hover:bg-accent-hover disabled:opacity-40"
          >
            레시피 저장
          </button>
        </div>
      </div>

      {incomplete ? (
        <p className="text-xs text-warn">재료와 양을 둘 다 넣거나 그 줄을 빼 주세요.</p>
      ) : null}
      {error ? <p className="text-xs text-loss">{error}</p> : null}
    </div>
  );
}
