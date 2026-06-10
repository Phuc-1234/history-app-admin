// src/types/api.ts
export type HierarchyState = 'PUBLIC' | 'PRIVATE';

export interface GradeDto {
  id: number;
  state: HierarchyState;
}

export interface TopicDto {
  id: number;
  name: string;
  position: number;
  gradeId: number;
}

export interface LessonDto {
  id: number;
  name: string;
  summary?: string | null;
  position: number;
  topicId: number;
}

export interface SectionDto {
  id: number;
  name: string;
  summary?: string | null;
  position: number;
  lessonId: number;
  parentSectionId?: number | null;
  children?: SectionDto[];
  nodes?: NodeDto[];
}

export interface NodeDto {
  id: number;
  position: number;
  header: string | null;
  body: string;
  imgUrl?: string | null;
  sectionId: number | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN';
  totalGold: number;
  totalXp: number;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AdminUserDto {
  id: string;
  email: string;
  name: string;
  role: string;
  totalXp: number;
  totalGold: number;
  isHidden: boolean;
  isVerified: boolean;
  profileImgUrl: string | null;
  currentStreak: number;
  highestStreak: number;
}

export interface AdminVideoDto {
  id: string;
  title: string;
  position: number;
  summary: string | null;
  hlsUrl: string;
  status: string;
  lessonId: number | null;
}

export interface AdminQuestionAnswerDto {
  id: number;
  content: string;
  isCorrect: boolean | null;
  leftText: string | null;
  rightText: string | null;
  correctAnswer: string | null;
}

export interface AdminQuestionDto {
  id: number;
  type: string;
  difficulty: number;
  promptText: string;
  document: string | null;
  gradeId: number | null;
  topicId: number | null;
  lessonId: number | null;
  sectionId: number | null;
  nodeId: number | null;
  answers: AdminQuestionAnswerDto[];
}

export interface AdminTestDto {
  id: string;
  title: string;
  summary: string | null;
  isManual: boolean;
  isNationalTest: boolean;
  questionNumber: number;
  timeLimit: number | null;
  xpReward: number;
  goldReward: number;
  passThreshold: number;
  gradeId: number | null;
  topicId: number | null;
  lessonId: number | null;
  sectionId: number | null;
  questionIds: number[];
}

