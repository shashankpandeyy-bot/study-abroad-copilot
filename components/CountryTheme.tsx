"use client";

import { useEffect } from "react";
import { NEUTRAL_THEME, themeFor } from "@/lib/countries";
import { useApp } from "@/lib/state";

// When exactly one country is chosen, the whole page takes on that country's colours.
// Pages read three CSS variables, so nothing else has to know about countries.
export default function CountryTheme() {
  const { state, hydrated } = useApp();
  const countries = state.profile.countries;

  useEffect(() => {
    if (!hydrated) return;
    const theme = themeFor(countries) ?? NEUTRAL_THEME;
    const root = document.documentElement.style;
    root.setProperty("--c-main", theme.main);
    root.setProperty("--c-ink", theme.ink);
    root.setProperty("--c-tint", theme.tint);
  }, [countries, hydrated]);

  return null;
}
