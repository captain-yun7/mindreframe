import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── users ───
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash"),
  nickname: text("nickname").notNull(),
  profileImage: text("profile_image"),
  provider: text("provider").default("email"),
  providerId: text("provider_id"),
  plan: text("plan").default("free"),
  planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
  role: text("role").notNull().default("user"),
  phoneNumber: text("phone_number"),
  notificationHour: integer("notification_hour").notNull().default(9),
  notificationsStartedAt: date("notifications_started_at"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  nicknameSet: boolean("nickname_set").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── notification_logs ───
export const notificationLogs = pgTable("notification_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  channel: text("channel").notNull().default("kakao_alimtalk"),
  status: text("status").notNull().default("pending"),
  externalMessageId: text("external_message_id"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── coach_chat_sessions ───
export const coachChatSessions = pgTable("coach_chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

// ─── coach_chat_messages ───
export const coachChatMessages = pgTable("coach_chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => coachChatSessions.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id),
  senderRole: text("sender_role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── subscriptions ───
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("active"),
  plan: text("plan").notNull(),
  billingKey: text("billing_key"),
  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
  }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", {
    withTimezone: true,
  }).notNull(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── payments ───
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
  orderId: text("order_id").unique().notNull(),
  paymentKey: text("payment_key"),
  amount: integer("amount").notNull(),
  plan: text("plan").notNull(),
  paymentType: text("payment_type").notNull(),
  status: text("status").notNull().default("pending"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── survey_responses ───
export const surveyResponses = pgTable("survey_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  channel: text("channel"),
  gender: text("gender"),
  ageGroup: text("age_group"),
  concernAreas: text("concern_areas").array(),
  depressionAnswers: integer("depression_answers").array(),
  depressionScore: integer("depression_score"),
  depressionSeverity: text("depression_severity"),
  anxietyAnswers: integer("anxiety_answers").array(),
  anxietyScore: integer("anxiety_score"),
  anxietySeverity: text("anxiety_severity"),
  recommendedTrack: text("recommended_track"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── chat_sessions ───
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title"),
  emotionBefore: integer("emotion_before"),
  emotionAfter: integer("emotion_after"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── chat_messages ───
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── chat_analyses ───
export const chatAnalyses = pgTable("chat_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  situation: text("situation"),
  automaticThought: text("automatic_thought"),
  distortionTypes: text("distortion_types").array(),
  emotions: jsonb("emotions"),
  alternativeThought: text("alternative_thought"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── emotion_scores ───
export const emotionScores = pgTable(
  "emotion_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    score: integer("score").notNull(),
    source: text("source").default("routine"),
    recordedAt: date("recorded_at").notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_emotion_user_date_source").on(
      table.userId,
      table.recordedAt,
      table.source,
    ),
  ],
);

// ─── routine_checks ───
export const routineChecks = pgTable(
  "routine_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    itemKey: text("item_key").notNull(),
    week: integer("week").notNull(),
    checkedAt: date("checked_at").notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_routine_user_item_date").on(
      table.userId,
      table.itemKey,
      table.checkedAt,
    ),
  ],
);

// ─── thought_records ───
export const thoughtRecords = pgTable("thought_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  situation: text("situation").notNull(),
  thought: text("thought").notNull(),
  emotion: text("emotion").notNull(),
  bodyReaction: text("body_reaction"),
  behavior: text("behavior"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── gratitude_entries ───
export const gratitudeEntries = pgTable("gratitude_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  recordedAt: date("recorded_at").notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── study_articles (F81 — 알고가기 콘텐츠) ───
// 폐기: studyContents (사용처 없음, 20260526_study_articles.sql에서 DROP)
export const studyArticles = pgTable("study_articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  category: text("category").notNull(), // 'core' | 'distortion' | 'body' | 'avoidance' | 'rumination'
  title: text("title").notNull(),
  sub: text("sub"),
  bodyHtml: text("body_html").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  videoId: text("video_id"), // deprecated (Cloudflare Stream) — F78 hotfix 이후 미사용, 컬럼은 rollback 안전성 위해 유지
  videoUrl: text("video_url"), // R2 객체 키 (예: video/study-core-1.mp4)
  requiredPlan: text("required_plan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

// ─── study_progress ───
// study_content_id FK는 5/2 logs_nullable_fk + 5/26 study_articles 마이그레이션에서 제거.
// content_slug text 컬럼만 사용 (FK 없음).
export const studyProgress = pgTable(
  "study_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    studyContentId: uuid("study_content_id"),
    contentSlug: text("content_slug"),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_study_user_content").on(
      table.userId,
      table.studyContentId,
    ),
  ],
);

// ─── notification_videos (F81 — 100일 알림용 3분 영상) ───
export const notificationVideos = pgTable("notification_videos", {
  dayNumber: integer("day_number").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  videoId: text("video_id"), // deprecated — F78 hotfix 이전 Cloudflare Stream UID
  videoUrl: text("video_url"), // R2 객체 키 (예: video/notify-day-1.mp4)
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

// ─── notification_messages (F86 — 100일 알림 메시지 콘텐츠) ───
export const notificationMessages = pgTable("notification_messages", {
  dayNumber: integer("day_number").primaryKey(),
  title: text("title"),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

// ─── site_settings (F89 — 사이트 전역 설정) ───
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

// ─── exercises ───
export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  difficulty: integer("difficulty").default(1),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── exercise_logs ───
export const exerciseLogs = pgTable("exercise_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id),
  note: text("note"),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow(),
});

// ─── meditations (F83 — 명상 콘텐츠) ───
// 폐기: meditationTracks (사용처 없음, 20260526_meditations.sql에서 DROP)
export const meditations = pgTable("meditations", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  category: text("category").notNull(), // 'person' | 'nature' | 'music'
  title: text("title").notNull(),
  description: text("description"),
  durationSeconds: integer("duration_seconds").notNull().default(180),
  audioUrl: text("audio_url"),
  videoId: text("video_id"),
  orderIndex: integer("order_index").notNull().default(0),
  requiredPlan: text("required_plan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

// ─── meditation_logs ───
// trackId FK는 5/2 logs_nullable_fk + 5/26 meditations 마이그레이션에서 제거.
// track_slug text 컬럼으로 추적.
export const meditationLogs = pgTable("meditation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  trackId: uuid("track_id"),
  trackSlug: text("track_slug"),
  trackTitle: text("track_title"),
  duration: integer("duration").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow(),
});

// ─── badges ───
export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").unique().notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  condition: jsonb("condition").notNull(),
});

// ─── user_badges ───
export const userBadges = pgTable(
  "user_badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    badgeId: uuid("badge_id")
      .notNull()
      .references(() => badges.id),
    earnedAt: timestamp("earned_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_user_badge").on(table.userId, table.badgeId),
  ],
);

// ─── ai_usage ───
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    usedAt: date("used_at").notNull().defaultNow(),
    count: integer("count").notNull().default(1),
  },
  (table) => [
    uniqueIndex("uq_ai_usage_user_date").on(table.userId, table.usedAt),
  ],
);
