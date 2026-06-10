export type RoomPhase = "lobby" | "playing" | "waiting" | "finished";

export interface RoomParticipant {
  id: string;
  username: string;
  emoji: string;
  is_host: boolean;
  has_finished: boolean;
}

export interface RoomQuestion {
  id: string;
  text: string;
}

export interface RoomState {
  room_id: string;
  code: string;
  phase: RoomPhase;
  question_count: number;
  my_voted_count: number;
  participants: RoomParticipant[];
  questions: RoomQuestion[];
  my_participant: RoomParticipant;
  guest_token?: string;
  waiting_deadline?: string;
  host_override_unlock_at?: string;
}

export interface ScoreboardEntry {
  participant_id: string;
  username: string;
  emoji: string;
  points: number;
}

export interface ResultStep {
  question_text: string;
  preto_count: number;
  branco_count: number;
  outcome: "preto" | "branco" | "tie";
  points: Record<string, number>; // participant_id → points this question
}

export interface RoomResults {
  room_id: string;
  scoreboard: ScoreboardEntry[];
  steps: ResultStep[];
}
