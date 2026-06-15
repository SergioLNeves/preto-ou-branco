import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { roomStateQueryOptions, roomKeys } from "@/infra/room/queries";
import { RoomWs, type ConnectionState } from "@/lib/room-ws";

// Events that change room/participant data the cached state needs to reflect.
// "vote_progress" is intentionally excluded — it would clobber the optimistic
// setQueryData() update from useSubmitRoomVote with a refetch.
const STATE_AFFECTING_EVENTS = ["phase_changed", "game_finished", "settings_updated", "participant_joined"];

export function useRoom(roomId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const wsRef = useRef<RoomWs | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");

  useEffect(() => {
    const ws = new RoomWs(roomId);
    wsRef.current = ws;
    ws.connect();
    ws.subscribe("connection_state", (state) => setConnectionState(state as ConnectionState));
    ws.subscribe("room_closed", () => {
      void navigate({ to: "/dashboard" });
    });
    for (const event of STATE_AFFECTING_EVENTS) {
      ws.subscribe(event, () => {
        queryClient.invalidateQueries({ queryKey: roomKeys.state(roomId) });
      });
    }
    return () => ws.disconnect();
  }, [roomId, queryClient, navigate]);

  const query = useQuery({
    ...roomStateQueryOptions(roomId),
    // Polling garante sincronização quando eventos WS passam pelo túnel e chegam com atraso
    refetchInterval: (query) => (query.state.status === "error" ? false : 3000),
    retry: false,
  });

  return { ...query, connectionState };
}
