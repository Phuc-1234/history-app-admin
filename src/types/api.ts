// src/types/api.ts
export type HierarchyState = 'PUBLIC' | 'PRIVATE';

export interface GradeDto {
  id: number;
  state: HierarchyState;
  isPro?: boolean;
  imgUrl?: string | null;
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
  isPro?: boolean;
  imgUrl?: string | null;
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
  videoId?: string | null;
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
  transcodeProgress?: number | null;
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
  explanation: string | null;
  isActive: boolean;
  scopeId: number | null;
  scopeType: string | null;
  answerDataJson: any;
  // Backup
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
  presetId: string | null;
  scopeId: number | null;
  scopeType: string | null;
  isNationalTest: boolean;
  isPro: boolean;
  imgUrl: string | null;
  questionIds: number[];
  // Backup
  isManual: boolean;
  questionNumber: number;
  timeLimit: number | null;
  xpReward: number;
  goldReward: number;
  passThreshold: number;
  gradeId: number | null;
  topicId: number | null;
  lessonId: number | null;
  sectionId: number | null;
}

export interface TestPresetDto {
  id: string;
  name: string;
  purposeType: 'EXAM' | 'PRACTICE';
  questionCount: number | null;
  passThreshold: number;
  timeLimit: number | null;
  difficultyRatioJson: any;
}

export interface ScopeTestPresetDefaultDto {
  scopeType: 'GRADE' | 'TOPIC' | 'LESSON' | 'SECTION' | 'NODE' | 'NATIONAL';
  purposeType: 'EXAM' | 'PRACTICE';
  defaultTestPresetId: string;
  presetName?: string;
}

export interface FlashcardDto {
  id: number;
  frontText: string;
  backText: string;
  lessonId: number | null;
  sectionId: number | null;
  nodeId: number | null;
}

export interface CreateFlashcardBody {
  frontText: string;
  backText: string;
  lessonId?: number;
  sectionId?: number;
  nodeId?: number;
}

export interface UpdateFlashcardBody {
  frontText?: string;
  backText?: string;
  lessonId?: number | null;
  sectionId?: number | null;
  nodeId?: number | null;
}

// ─── Reward Rule ──────────────────────────────────────────────────────────────

export type RewardTriggerType =
  | 'MANUAL_TEST_COMPLETE'
  | 'AUTO_NODE_TEST_COMPLETE'
  | 'AUTO_SECTION_TEST_COMPLETE'
  | 'AUTO_LESSON_TEST_COMPLETE'
  | 'AUTO_TOPIC_TEST_COMPLETE'
  | 'AUTO_GRADE_TEST_COMPLETE'
  | 'AUTO_PERSONAL_PRACTICE_COMPLETE'
  | 'AUTO_WRONG_PRACTICE_COMPLETE'
  | 'STREAK_REACHED'
  | 'TIER_REACHED';

export interface RewardRuleItemDto {
  id: number;
  rewardRuleId: number;
  itemDefinitionId: number;
  quantity: number;
  itemDefinition?: ItemDefinitionDto;
}

export interface RewardRuleDto {
  id: number;
  triggerType: RewardTriggerType;
  triggerTargetId: string | null;
  triggerTimeMin: number;
  triggerTimeMax: number | null;
  xp: number;
  gold: number;
  rewardRuleItems?: RewardRuleItemDto[];
}

export interface CreateRewardRuleBody {
  triggerType: RewardTriggerType;
  triggerTargetId?: string | null;
  triggerTimeMin: number;
  triggerTimeMax?: number | null;
  xp?: number;
  gold?: number;
  items?: { itemDefinitionId: number; quantity: number }[];
}

export interface UpdateRewardRuleBody {
  triggerType?: RewardTriggerType;
  triggerTargetId?: string | null;
  triggerTimeMin?: number;
  triggerTimeMax?: number | null;
  xp?: number;
  gold?: number;
  items?: { itemDefinitionId: number; quantity: number }[];
}

export type ItemDefinitionType = 'SKIN' | 'XP_MUL' | 'GOLD_MUL' | 'BADGE';
export type EquipmentSlot = 'AVT_FRAME' | 'BACKGROUND';

export interface ItemDefinitionDto {
  id: number;
  name: string;
  description: string | null;
  shownInStore: boolean;
  price: number;
  itemType: ItemDefinitionType;
  effectValue: number | null;
  imgUrl: string | null;
  shopImgUrl: string | null;
  equipmentSlot: EquipmentSlot | null;
  durationMinutes: number | null;
}

// ─── Tier ────────────────────────────────────────────────────────────────────

export interface TierDto {
  index: number;
  name: string;
  badgeImgUrl: string | null;
  description: string | null;
  xpThreshold: number;
  rewardRule?: RewardRuleDto | null;
}

export interface CreateTierBody {
  index: number;
  name: string;
  badgeImgUrl?: string | null;
  description?: string | null;
  xpThreshold: number;
  xpReward?: number;
  goldReward?: number;
  rewardRuleItems?: { itemDefinitionId: number; quantity: number }[];
}

export interface UpdateTierBody {
  name?: string;
  badgeImgUrl?: string | null;
  description?: string | null;
  xpThreshold?: number;
  xpReward?: number;
  goldReward?: number;
  rewardRuleItems?: { itemDefinitionId: number; quantity: number }[];
}

// ─── Packages ─────────────────────────────────────────────────────────────────

export interface GoldPackageDto {
  id: string;
  name: string;
  goldAmount: number;
  bonusGold: number;
  priceVnd: number;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProPackageDto {
  id: string;
  name: string;
  durationDays: number;
  priceVnd: number;
  originalPriceVnd: number | null;
  description: string | null;
  isRecommended: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

