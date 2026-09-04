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
  profileImgUrl?: string | null;
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
  lastXpGainedAt: string | null;
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
  scopeName?: string | null;
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
  lesson?: { id: number; name: string; position: number } | null;
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
  scopeType?: 'LESSON' | 'SECTION' | 'NODE' | null;
  scopeId?: number | null;
  scopeName?: string | null;
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
export type EquipmentSlot = 'AVT_FRAME' | 'BACKGROUND' | 'LEADERBOARD_BG';

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

// ─── Dashboard / Overview ────────────────────────────────────────────────────

/** Response shape của /api/admin/stats (số đếm tĩnh). */
export interface OverviewStats {
  grades: number;
  topics: number;
  lessons: number;
  sections: number;
  users: number;
  videos: number;
  questions: number;
  tests: number;
  flashcards: number;
  rewardRules: number;
}

/** Các KPI tính từ danh sách user (derived). */
export interface OverviewDerivedStats {
  totalUsers: number;
  totalXp: number;
  totalGold: number;
  avgXp: number;
  avgGold: number;
  avgStreak: number;
  verifiedCount: number;
  verifiedRatio: number; // 0..1
  activeTodayCount: number; // user có lastXpGainedAt trong hôm nay
}

/** Một điểm dữ liệu cho biểu đồ hoạt động theo ngày. */
export interface DailyActivityPoint {
  date: string; // YYYY-MM-DD
  label: string; // dd/MM
  count: number; // số user active ngày đó
  cumulative: number; // lũy kế trong khoảng
}

/** Section 1 — Hoạt động làm bài theo ngày. */
export interface TestActivityPoint {
  date: string; // YYYY-MM-DD
  label: string; // dd/MM
  totalAttempts: number; // tổng lượt nộp bài
  distinctUsers: number; // số user nộp bài
  manualAttempts: number; // đề thủ công (testId NOT NULL)
  autoAttempts: number; // đề tự động (testId NULL)
}

/** Section 2 — KPI tổng quan làm bài trong N ngày. */
export interface TestOverviewStats {
  totalAttempts: number;
  distinctUsers: number;
  manualAttempts: number;
  autoAttempts: number;
  passedCount: number;
  failedCount: number;
  avgScore: number;
  passRate: number; // %, 0-100
}

/** Section 3 — Một câu hỏi trong top câu dễ sai. */
export interface WrongQuestionRow {
  questionId: number;
  promptText: string;
  type: string; // CHOOSE | FILL | MATCH
  difficulty: number;
  totalAnswers: number;
  wrongCount: number;
  wrongRate: number; // %, 0-100
}

/** Section 3 — Phân bố đúng/sai theo loại câu hỏi. */
export interface QuestionTypeBreakdown {
  type: string;
  total: number;
  wrongCount: number;
  wrongRate: number; // %, 0-100
}

/** Phân bố user theo role cho donut chart. */
export interface RoleSlice {
  name: string;
  value: number;
}

/** Phân bố user theo nhóm streak cho bar chart. */
export interface StreakBucket {
  bucket: string; // "0", "1-7", "8-30", "31+"
  count: number;
}

/** Một mục trong Activity Feed (gộp feedback + user gain xp). */
export interface ActivityItem {
  id: string;
  kind: 'feedback' | 'xp_gain';
  timestamp: number; // epoch ms, dùng để sort
  title: string;
  subtitle?: string;
  accent: string;
}

/** Toàn bộ dữ liệu đã xử lý cho tab Overview. */
export interface DashboardData {
  stats: OverviewStats | null;
  users: AdminUserDto[];
  derived: OverviewDerivedStats | null;
  // NOTE: activitySeries được fetch riêng trong GrowthCharts từ /api/admin/stats/xp-activity.
  roleSlices: RoleSlice[];
  streakBuckets: StreakBucket[];
  topXp: AdminUserDto[];
  topStreak: AdminUserDto[];
  topGold: AdminUserDto[];
  activityFeed: ActivityItem[];
}

export interface AiUsageSummary {
  totalTokensInPeriod: number;
  activeUsersCount: number;
  avgTokensPerUser: number;
  topUserTokens: number;
  periodDays: number | 'all';
  startStr?: string;
  endStr?: string;
}

export interface AiUsageTimeSeriesPoint {
  date: string;
  totalTokens: number;
  activeUsersCount: number;
}

export interface AiUserRankingItem {
  rank: number;
  userId: string;
  name: string;
  email: string | null;
  profileImgUrl: string | null;
  role: string;
  isPro: boolean;
  tokensInPeriod: number;
  tokensAllTime: number;
  sessionCount: number;
  sharePercent: number;
}

export interface AiUsageStatsResponse {
  summary: AiUsageSummary;
  timeSeries: AiUsageTimeSeriesPoint[];
  rankings: AiUserRankingItem[];
}


