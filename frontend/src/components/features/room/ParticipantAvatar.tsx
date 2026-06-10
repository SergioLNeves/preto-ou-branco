import type { RoomParticipant } from "@/types/room";

interface Props {
  participant: RoomParticipant;
  size?: "sm" | "md" | "lg";
}

export function ParticipantAvatar({ participant, size = "md" }: Props) {
  const sz =
    size === "lg"
      ? "w-20 h-20 text-4xl"
      : size === "md"
        ? "w-14 h-14 text-2xl"
        : "w-9 h-9 text-lg";
  const nameSize = size === "lg" ? "text-xs max-w-[72px]" : "text-xs max-w-[48px]";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`${sz} rounded-full bg-[rgba(245,245,245,0.08)] border-2 border-[rgba(245,245,245,0.2)] flex items-center justify-center relative`}
      >
        {participant.emoji}
        {participant.is_host && (
          <span className="absolute -top-1 -right-1 text-xs">⭐</span>
        )}
      </div>
      <span
        className={`${nameSize} tracking-[0.12em] uppercase text-[rgba(245,245,245,0.55)] truncate text-center`}
      >
        {participant.username}
      </span>
    </div>
  );
}
