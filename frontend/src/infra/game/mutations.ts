import { useMutation } from "@tanstack/react-query";
import { SubmitVote } from "../../../wailsjs/go/bindings/GameApp";
import type { Choice, VoteResult } from "@/types/game";

interface SubmitVoteInput {
  questionId: string;
  choice: Choice;
}

export function useSubmitVote() {
  return useMutation({
    mutationFn: async (input: SubmitVoteInput): Promise<VoteResult> => {
      const data = await SubmitVote(input.questionId, input.choice);
      return {
        questionId: data.question_id,
        pctPreto: data.pct_preto,
        pctBranco: data.pct_branco,
        total: data.total,
      };
    },
  });
}
