export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

export interface QuestionOption {
  key: "A" | "B" | "C" | "D";
  text: string;
  explanation: string;
}

export interface QuestionData {
  id: string;
  statement: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  difficulty: DifficultyLevel;
  syllabusRef?: string | null;
  chapterId: string;
  chapterTitle?: string;
}

export interface SimulationResult {
  simulationId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpentSec: number;
  createdAt: string;
  answers: AnswerResult[];
}

export interface AnswerResult {
  questionId: string;
  question: QuestionData;
  selectedAnswer: string;
  isCorrect: boolean;
}

export interface ChapterWithCount {
  id: string;
  title: string;
  materialId: string;
  orderIndex: number;
  questionCount: number;
}

export interface DashboardStats {
  totalSimulations: number;
  averageScore: number;
  totalQuestions: number;
  totalMaterials: number;
  recentSimulations: {
    id: string;
    percentage: number;
    score: number;
    totalQuestions: number;
    createdAt: string;
  }[];
  weakChapters: {
    chapterId: string;
    chapterTitle: string;
    errorCount: number;
    totalAnswered: number;
  }[];
}
