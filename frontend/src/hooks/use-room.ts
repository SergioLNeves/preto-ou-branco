import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { roomStateQueryOptions, roomKeys } from "@/infra/room/queries";
import { RoomWs } from "@/lib/room-ws";

export function useRoom(roomId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const wsRef = useRef<RoomWs | null>(null);

  useEffect(() => {
    const ws = new RoomWs(roomId);
    wsRef.current = ws;
    ws.connect();
    ws.subscribe("room_closed", () => {
      void navigate({ to: "/dashboard" });
    });
    ws.subscribe("*", () => {
      queryClient.invalidateQueries({ queryKey: roomKeys.state(roomId) });
    });
    return () => ws.disconnect();
  }, [roomId, queryClient, navigate]);

  return useQuery({
    ...roomStateQueryOptions(roomId),
    // Polling garante sincronização quando eventos WS passam pelo túnel e chegam com atraso
    refetchInterval: 3000,
  });
}
