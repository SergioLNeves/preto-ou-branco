import { queryOptions } from "@tanstack/react-query";
import { isWails, getServerBaseURL } from "@/lib/server-url";
import type { Question, DayVotesEntry } from "@/types/game";

export const randomQuestionsQueryOptions = queryOptions({
  queryKey: ["questions", "random"],
  queryFn: async (): Promise<Question[]> => {
    if (isWails()) {
      const { RandomQuestions } = await import("../../../wailsjs/go/bindings/GameApp");
      return RandomQuestions(30) as Promise<Question[]>;
    }
    const res = await fetch(`${getServerBaseURL()}/v1/game/questions/random?limit=30`);
    if (!res.ok) throw new Error("erro ao carregar perguntas");
    return res.json() as Promise<Question[]>;
  },
  staleTime: 0,
});

export const todayResultsQueryOptions = queryOptions({
  queryKey: ["votes", "today"],
  queryFn: async (): Promise<DayVotesEntry[]> => {
    if (isWails()) {
      const { TodayResults } = await import("../../../wailsjs/go/bindings/GameApp");
      return TodayResults() as Promise<DayVotesEntry[]>;
    }
    const res = await fetch(`${getServerBaseURL()}/v1/game/today`);
    if (!res.ok) throw new Error("erro ao carregar resultados");
    return res.json() as Promise<DayVotesEntry[]>;
  },
  staleTime: 1000 * 60 * 10,
});
