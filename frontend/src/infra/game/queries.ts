import { queryOptions } from "@tanstack/react-query";
import { RandomQuestions, TodayResults } from "../../../wailsjs/go/bindings/GameApp";
import type { Question, DayVotesEntry } from "@/types/game";

export const randomQuestionsQueryOptions = queryOptions({
  queryKey: ["questions", "random"],
  queryFn: (): Promise<Question[]> => RandomQuestions(30) as Promise<Question[]>,
  staleTime: 0,
});

export const todayResultsQueryOptions = queryOptions({
  queryKey: ["votes", "today"],
  queryFn: (): Promise<DayVotesEntry[]> => TodayResults() as Promise<DayVotesEntry[]>,
  staleTime: 1000 * 60 * 10,
});
