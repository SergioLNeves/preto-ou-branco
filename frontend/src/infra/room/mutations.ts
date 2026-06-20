import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api-client";
import type { RoomDifficulty, RoomState } from "@/types/room";
import { roomKeys } from "./queries";

export function useCreateRoom() {
  return useMutation({
    mutationFn: (questionCount: number) => {
      const emoji = localStorage.getItem("user_avatar") ?? undefined;
      return apiPost<RoomState>("/v1/rooms", { question_count: questionCount, emoji });
    },
  });
}

export function useJoinRoom() {
  return useMutation({
    mutationFn: async ({ roomId, username }: { roomId: string; username: string }) => {
      const emoji = localStorage.getItem("user_avatar") ?? undefined;
      const state = await apiPost<RoomState>("/v1/rooms/join", { room_id: roomId, username, emoji });
      if (state.guest_token) {
        localStorage.setItem("room_guest_token", state.guest_token);
      }
      return state;
    },
  });
}

export function useCloseRoom(roomId: string) {
  return useMutation({
    mutationFn: () => apiPost<void>(`/v1/rooms/${roomId}`, undefined, "DELETE"),
  });
}

export interface UpdateRoomSettingsPayload {
  question_count?: number;
  difficulty?: RoomDifficulty;
}

export function useUpdateRoomSettings(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateRoomSettingsPayload) =>
      apiPost<void>(`/v1/rooms/${roomId}/settings`, payload, "PATCH"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.state(roomId) }),
  });
}

export function useStartRoom(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<void>(`/v1/rooms/${roomId}/start`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.state(roomId) }),
  });
}

export function useRestartRoom(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<void>(`/v1/rooms/${roomId}/restart`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.state(roomId) }),
  });
}

export function useSubmitRoomVote(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomQuestionId, choice }: { roomQuestionId: string; choice: "preto" | "branco" }) =>
      apiPost<RoomState>(`/v1/rooms/${roomId}/vote`, { room_question_id: roomQuestionId, choice }),
    onSuccess: (data) => queryClient.setQueryData(roomKeys.state(roomId), data),
  });
}
