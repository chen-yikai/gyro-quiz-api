export type Difficulty = "easy" | "medium" | "hard";

export interface QuestionsInfo {
  name: string;
  info: string;
  version: string;
  author: string[];
  totalQuestionCount: number;
}

export interface ScoreConfig {
  easy: number;
  medium: number;
  hard: number;
  penalty: number;
}

export interface QuestionOption {
  id: number;
  title: string;
}

export interface Question {
  id: number;
  content: string;
  difficulty: Difficulty;
  options: QuestionOption[];
  correctAnswer: number[];
}

export interface QuestionsJson {
  info: QuestionsInfo;
  score: ScoreConfig;
  data: Question[];
}

export type Questions = QuestionsJson["data"];

// History types - 遊戲中每道題目的作答狀態
export interface OptionAttempt {
  optionId: number;
  attempts: number;
}

export interface QuestionAnswer {
  questionId: number;
  options: OptionAttempt[];
}

export interface HistoryEntry {
  id: string;
  userId: string;
  difficulty: Difficulty;
  score: number;
  questions: QuestionAnswer[];
  createdAt: string;
}

export interface HistoryJson {
  data: HistoryEntry[];
}

// OAuth types
export interface OAuthUser {
  userId: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface OAuthJson {
  data: OAuthUser[];
}
