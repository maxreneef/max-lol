"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { PLATFORMS } from "./types";

const ALL_REGIONS = Object.keys(PLATFORMS);

export function useRegionFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const raw = searchParams.get("regions") ?? "all";
  const isAll = raw === "all";
  const isNone = raw === "none";

  const selected = useMemo((): string[] => {
    if (isAll) return [...ALL_REGIONS];
    if (isNone) return [];
    // Filtra valores inválidos da URL
    return raw.split(",").filter((r) => r in PLATFORMS);
  }, [raw, isAll, isNone]);

  const setRegions = useCallback(
    (regions: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (regions.length === 0 || regions.length === ALL_REGIONS.length) {
        params.delete("regions");
      } else {
        params.set("regions", regions.join(","));
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const toggle = useCallback(
    (region: string) => {
      if (selected.includes(region)) {
        setRegions(selected.filter((r) => r !== region));
      } else {
        setRegions([...selected, region]);
      }
    },
    [selected, setRegions]
  );

  const selectAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("regions");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const deselectAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("regions", "none");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return { selected, isAll, isNone, setRegions, toggle, selectAll, deselectAll, allRegions: ALL_REGIONS };
}
