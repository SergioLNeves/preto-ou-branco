export type Choice = "preto" | "branco";

export interface Question {
  id: string;
  category_id: string;
  text: string;
  image_url?: string;
}
