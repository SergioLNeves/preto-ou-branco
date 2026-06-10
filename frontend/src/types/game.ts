export type Choice = "preto" | "branco";

export interface Category {
  id: string;
  slug: string;
  name: string;
  emoji: string;
}

export interface Question {
  id: string;
  category_id: string;
  text: string;
  image_url?: string;
}

export interface VoteResult {
  questionId: string;
  pctPreto: number;
  pctBranco: number;
  total: number;
}

export interface DayVotesEntry {
  question_id: string;
  text: string;
  votes_preto: number;
  votes_branco: number;
  total: number;
}
