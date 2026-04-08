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
  onboardingCompleted: boolean("onboarding_completed").default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
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

// ─── study_contents ───
export const studyContents = pgTable("study_contents", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  dayNumber: integer("day_number").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── study_progress ───
export const studyProgress = pgTable(
  "study_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    studyContentId: uuid("study_content_id")
      .notNull()
      .references(() => studyContents.id),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_study_user_content").on(
      table.userId,
      table.studyContentId,
    ),
  ],
);

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

// ─── meditation_tracks ───
export const meditationTracks = pgTable("meditation_tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── meditation_logs ───
export const meditationLogs = pgTable("meditation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  trackId: uuid("track_id")
    .notNull()
    .references(() => meditationTracks.id),
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
