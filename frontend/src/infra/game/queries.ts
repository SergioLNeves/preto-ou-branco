import { queryOptions } from "@tanstack/react-query";
import { withWails } from "@/lib/server-url";
import { apiGet } from "@/lib/api-client";
import type { Question, DayVotesEntry } from "@/types/game";

export const randomQuestionsQueryOptions = queryOptions({
  queryKey: ["questions", "random"],
  queryFn: (): Promise<Question[]> =>
    withWails(
      async () => {
        const { RandomQuestions } = await import("../../../wailsjs/go/bindings/GameApp");
        return RandomQuestions(30) as Promise<Question[]>;
      },
      () => apiGet<Question[]>("/v1/game/questions/random?limit=30"),
    ),
  staleTime: 0,
});

export const todayResultsQueryOptions = queryOptions({
  queryKey: ["votes", "today"],
  queryFn: (): Promise<DayVotesEntry[]> =>
    withWails(
      async () => {
        const { TodayResults } = await import("../../../wailsjs/go/bindings/GameApp");
        return TodayResults() as Promise<DayVotesEntry[]>;
      },
      () => apiGet<DayVotesEntry[]>("/v1/game/today"),
    ),
  staleTime: 1000 * 60 * 10,
});
