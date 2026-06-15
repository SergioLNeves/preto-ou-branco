import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api-client";
import type { RoomState } from "@/types/room";
import { roomKeys } from "./queries";

export function useCreateRoom() {
  return useMutation({
    mutationFn: (questionCount: number) =>
      apiPost<RoomState>("/v1/rooms", { question_count: questionCount }),
  });
}

export function useJoinRoom() {
  return useMutation({
    mutationFn: async ({ roomId, username }: { roomId: string; username: string }) => {
      const state = await apiPost<RoomState>("/v1/rooms/join", { room_id: roomId, username });
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

export function useUpdateRoomSettings(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionCount: number) =>
      apiPost<void>(`/v1/rooms/${roomId}/settings`, { question_count: questionCount }, "PATCH"),
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
