import { useMutation } from "@tanstack/react-query";
import { isWails, getServerBaseURL } from "@/lib/server-url";
import type { Choice, VoteResult } from "@/types/game";

interface SubmitVoteInput {
  questionId: string;
  choice: Choice;
}

interface VoteResultResponse {
  question_id: string;
  pct_preto: number;
  pct_branco: number;
  total: number;
}

export function useSubmitVote() {
  return useMutation({
    mutationFn: async (input: SubmitVoteInput): Promise<VoteResult> => {
      let data: VoteResultResponse;
      if (isWails()) {
        const { SubmitVote } = await import("../../../wailsjs/go/bindings/GameApp");
        data = (await SubmitVote(input.questionId, input.choice)) as VoteResultResponse;
      } else {
        const res = await fetch(`${getServerBaseURL()}/v1/game/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question_id: input.questionId, choice: input.choice }),
        });
        if (!res.ok) throw new Error("erro ao registrar voto");
        data = (await res.json()) as VoteResultResponse;
      }
      return {
        questionId: data.question_id,
        pctPreto: data.pct_preto,
        pctBranco: data.pct_branco,
        total: data.total,
      };
    },
  });
}
