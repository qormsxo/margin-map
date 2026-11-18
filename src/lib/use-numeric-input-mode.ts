"use client";

import { useEffect, useState } from "react";

/**
 * `inputMode` for number fields, only on touch devices.
 *
 * On Windows, the Korean IME switches to English when a field has
 * inputmode="numeric" and often stays English in the next text field
 * (e.g. 판매가 → 메뉴명). Phones still need it for the number keypad.
 */
export function useNumericInputMode() {
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  return {
    numeric: touch ? ("numeric" as const) : undefined,
    decimal: touch ? ("decimal" as const) : undefined,
  };
}
