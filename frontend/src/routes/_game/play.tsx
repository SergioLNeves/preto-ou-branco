import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useCallback, useState } from "react";
import { toast } from "sonner";
import { useSubmitVote } from "@/infra/game/mutations";
import { randomQuestionsQueryOptions } from "@/infra/game/queries";
import { EngulfTransition } from "@/components/features/game/EngulfTransition";
import { QuestionCard } from "@/components/features/game/QuestionCard";
import { ResultView } from "@/components/features/game/ResultView";
import type { Choice, VoteResult } from "@/types/game";

export const Route = createFileRoute("/_game/play")({
  component: () => (
    <Suspense fallback={<PlayLoading />}>
      <Play />
    </Suspense>
  ),
});

function PlayLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
    </div>
  );
}

type Phase = "question" | "result";

function Play() {
  const navigate = useNavigate();
  const { data: questions } = useSuspenseQuery(randomQuestionsQueryOptions);
  const submitVote = useSubmitVote();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [pendingChoice, setPendingChoice] = useState<Choice | null>(null);
  const [animating, setAnimating] = useState(false);
  const [result, setResult] = useState<VoteResult | null>(null);
  const question = questions[currentIndex];

  const handleAnswer = useCallback(
    (choice: Choice) => {
      setPendingChoice(choice);
      setAnimating(true);
      setTimeout(async () => {
        try {
          const res = await submitVote.mutateAsync({
            questionId: question.id,
            choice,
          });
          setResult(res);
          setPhase("result");
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Erro ao enviar resposta.";
          toast.error(message);
          setPendingChoice(null);
        } finally {
          setAnimating(false);
        }
      }, 750);
    },
    [question, submitVote],
  );

  const handleNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      void navigate({ to: "/" });
    } else {
      setCurrentIndex(nextIndex);
      setPhase("question");
      setResult(null);
      setPendingChoice(null);
    }
  }, [currentIndex, questions.length, navigate]);

  if (!question) {
    void navigate({ to: "/" });
    return null;
  }

  return (
    <div className="absolute inset-0">
      {phase === "question" && (
        <>
          <QuestionCard
            key={question.id}
            question={question}
            currentIndex={currentIndex}
            total={questions.length}
            disabled={animating || submitVote.isPending}
            onAnswer={handleAnswer}
          />
          <EngulfTransition choice={pendingChoice} animating={animating} />
        </>
      )}

      {phase === "result" && result && (
        <ResultView
          result={result}
          isLast={currentIndex >= questions.length - 1}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
