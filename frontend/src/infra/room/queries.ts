import { queryOptions } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { RoomState, RoomResults } from "@/types/room";

export const roomKeys = {
  state: (roomId: string) => ["room", roomId, "state"] as const,
  results: (roomId: string) => ["room", roomId, "results"] as const,
};

export const roomStateQueryOptions = (roomId: string) =>
  queryOptions({
    queryKey: roomKeys.state(roomId),
    queryFn: () => apiGet<RoomState>(`/v1/rooms/${roomId}/state`),
    staleTime: 30_000,
  });

export const roomResultsQueryOptions = (roomId: string) =>
  queryOptions({
    queryKey: roomKeys.results(roomId),
    queryFn: () => apiGet<RoomResults>(`/v1/rooms/${roomId}/results`),
    staleTime: Number.POSITIVE_INFINITY,
  });
