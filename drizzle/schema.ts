import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow and student/admin roles.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  referralCode: varchar("referralCode", { length: 32 }).unique(),
  referredByUserId: int("referredByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Courses table supporting multi-course Academy catalog.
 */
export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  tagline: text("tagline"),
  description: text("description"),
  shortDescription: text("shortDescription"),
  category: varchar("category", { length: 100 }).notNull(),
  instructor: varchar("instructor", { length: 150 }).default("BuduTech Academy").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).default("0.00").notNull(),
  level: mysqlEnum("level", ["Beginner", "Intermediate", "Advanced"]).default("Beginner").notNull(),
  imageUrl: text("imageUrl"),
  published: boolean("published").default(false).notNull(),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;

/**
 * Course Modules table for structuring curriculum.
 */
export const courseModules = mysqlTable("course_modules", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CourseModule = typeof courseModules.$inferSelect;
export type InsertCourseModule = typeof courseModules.$inferInsert;

/**
 * Course Lessons table supporting video embeds and text content.
 */
export const courseLessons = mysqlTable("course_lessons", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  moduleId: int("moduleId"),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  contentType: mysqlEnum("contentType", ["video", "text"]).default("video").notNull(),
  videoUrl: text("videoUrl"),
  contentHtml: text("contentHtml"),
  durationMinutes: int("durationMinutes").default(15).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CourseLesson = typeof courseLessons.$inferSelect;
export type InsertCourseLesson = typeof courseLessons.$inferInsert;

/**
 * Live training events & campaigns (e.g., Free Website Building Live Training).
 */
export const trainingEvents = mysqlTable("training_events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startDate: timestamp("startDate").notNull(),
  startTime: varchar("startTime", { length: 50 }).notNull(),
  timeZone: varchar("timeZone", { length: 50 }).default("WAT (West Africa Time)").notNull(),
  registrationStatus: mysqlEnum("registrationStatus", ["open", "closed", "completed"]).default("open").notNull(),
  capacity: int("capacity").default(1000).notNull(),
  youtubeLiveUrl: text("youtubeLiveUrl"),
  replayUrl: text("replayUrl"),
  replayAvailable: boolean("replayAvailable").default(false).notNull(),
  replayMode: mysqlEnum("replayMode", ["free", "paid", "restricted", "unavailable"]).default("free").notNull(),
  activeCampaign: boolean("activeCampaign").default(true).notNull(),
  prizeDescription: text("prizeDescription"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrainingEvent = typeof trainingEvents.$inferSelect;
export type InsertTrainingEvent = typeof trainingEvents.$inferInsert;

/**
 * Event registrations used for campaign access, capacity checks, and public counters.
 */
export const eventRegistrations = mysqlTable("event_registrations", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["registered", "cancelled", "attended"]).default("registered").notNull(),
  registeredAt: timestamp("registeredAt").defaultNow().notNull(),
});

export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type InsertEventRegistration = typeof eventRegistrations.$inferInsert;

/**
 * Traceable referral records for campaign qualification and audit.
 */
export const referralRecords = mysqlTable("referral_records", {
  id: int("id").autoincrement().primaryKey(),
  referrerUserId: int("referrerUserId").notNull(),
  referredUserId: int("referredUserId").notNull().unique(),
  eventId: int("eventId"),
  referralCode: varchar("referralCode", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["pending", "qualified", "rejected", "duplicate"]).default("qualified").notNull(),
  qualificationReason: varchar("qualificationReason", { length: 255 }).default("Valid registration via referral link").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReferralRecord = typeof referralRecords.$inferSelect;
export type InsertReferralRecord = typeof referralRecords.$inferInsert;

/**
 * Campaign competition and prize configuration.
 */
export const competitions = mysqlTable("competitions", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  eventId: int("eventId"),
  status: mysqlEnum("status", ["active", "ended", "draft"]).default("active").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  qualificationRules: text("qualificationRules"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = typeof competitions.$inferInsert;

/**
 * Cohorts table for structured training groups.
 */
export const cohorts = mysqlTable("cohorts", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  capacity: int("capacity").default(500).notNull(),
  status: mysqlEnum("status", ["open", "active", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Cohort = typeof cohorts.$inferSelect;
export type InsertCohort = typeof cohorts.$inferInsert;

/**
 * Student enrollments in courses/events.
 */
export const enrollments = mysqlTable("enrollments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  cohortId: int("cohortId"),
  status: mysqlEnum("status", ["active", "completed", "refunded"]).default("active").notNull(),
  paymentReference: varchar("paymentReference", { length: 128 }),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }).default("0.00").notNull(),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
});

export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = typeof enrollments.$inferInsert;

/**
 * Payment transaction lifecycle for server-initialized, server-verified Paystack checkout.
 */
export const paymentTransactions = mysqlTable("payment_transactions", {
  id: int("id").autoincrement().primaryKey(),
  reference: varchar("reference", { length: 128 }).notNull().unique(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  amountKobo: int("amountKobo").notNull(),
  currency: varchar("currency", { length: 8 }).default("NGN").notNull(),
  status: mysqlEnum("status", ["initialized", "paid", "failed"]).default("initialized").notNull(),
  authorizationUrl: text("authorizationUrl"),
  providerTransactionId: varchar("providerTransactionId", { length: 128 }),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;

/**
 * Lesson completion progress tracking for students.
 */
export const lessonProgress = mysqlTable("lesson_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lessonId: int("lessonId").notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LessonProgress = typeof lessonProgress.$inferSelect;
export type InsertLessonProgress = typeof lessonProgress.$inferInsert;

/**
 * Certificates issued upon course completion.
 */
export const certificates = mysqlTable("certificates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  certificateCode: varchar("certificateCode", { length: 64 }).notNull().unique(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  pdfUrl: text("pdfUrl"),
});

export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = typeof certificates.$inferInsert;

/**
 * Waitlist entries for courses or events.
 */
export const waitlistEntries = mysqlTable("waitlist_entries", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId"),
  eventId: int("eventId"),
  fullName: varchar("fullName", { length: 150 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  status: mysqlEnum("status", ["pending", "notified"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type InsertWaitlistEntry = typeof waitlistEntries.$inferInsert;

/**
 * Blog and resources articles.
 */
export const blogPosts = mysqlTable("blog_posts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  category: varchar("category", { length: 100 }).notNull(),
  tags: text("tags"),
  coverImage: text("coverImage"),
  summary: text("summary"),
  contentHtml: text("contentHtml"),
  authorName: varchar("authorName", { length: 150 }).default("BuduTech Team").notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

/**
 * Outbound email notifications and broadcast logs.
 */
export const emailNotifications = mysqlTable("email_notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["sent", "failed"]).default("sent").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type EmailNotification = typeof emailNotifications.$inferSelect;
export type InsertEmailNotification = typeof emailNotifications.$inferInsert;
