import { useMutation } from "@tanstack/react-query";
import { withWails } from "@/lib/server-url";
import { apiPost } from "@/lib/api-client";
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
      const data = await withWails(
        async () => {
          const { SubmitVote } = await import("../../../wailsjs/go/bindings/GameApp");
          return (await SubmitVote(input.questionId, input.choice)) as VoteResultResponse;
        },
        () =>
          apiPost<VoteResultResponse>("/v1/game/vote", {
            question_id: input.questionId,
            choice: input.choice,
          }),
      );
      return {
        questionId: data.question_id,
        pctPreto: data.pct_preto,
        pctBranco: data.pct_branco,
        total: data.total,
      };
    },
  });
}
