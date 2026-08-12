import { eq, desc, sql, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  courses,
  courseModules,
  courseLessons,
  trainingEvents,
  cohorts,
  enrollments,
  lessonProgress,
  referralRecords,
  certificates,
  waitlistEntries,
  blogPosts,
  emailNotifications,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from "nanoid";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Generate referral code if user doesn't have one yet
    const generatedReferralCode = user.referralCode || `BUDU-${nanoid(6).toUpperCase()}`;

    const values: InsertUser = {
      openId: user.openId,
      referralCode: generatedReferralCode,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.referredByUserId !== undefined) {
      values.referredByUserId = user.referredByUserId;
      updateSet.referredByUserId = user.referredByUserId;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByReferralCode(referralCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.referralCode, referralCode)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Course Queries
export async function getPublishedCourses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).where(eq(courses.published, true)).orderBy(desc(courses.createdAt));
}

export async function getAllCoursesAdmin() {
  const db = await getdbOrNull();
  if (!db) return [];
  return db.select().from(courses).orderBy(desc(courses.createdAt));
}

async function getdbOrNull() {
  return await getDb();
}

export async function getCourseBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCourseModulesAndLessons(courseId: number) {
  const db = await getDb();
  if (!db) return { modules: [], lessons: [] };
  const mods = await db.select().from(courseModules).where(eq(courseModules.courseId, courseId)).orderBy(asc(courseModules.sortOrder));
  const less = await db.select().from(courseLessons).where(eq(courseLessons.courseId, courseId)).orderBy(asc(courseLessons.sortOrder));
  return { modules: mods, lessons: less };
}

// Active Training Event
export async function getActiveTrainingEvent() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(trainingEvents).where(eq(trainingEvents.activeCampaign, true)).orderBy(desc(trainingEvents.startDate)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Registration Count
export async function getTotalRegistrationsCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(users);
  return Number(result[0]?.count || 0);
}

// Referrals & Leaderboard
export async function getReferralsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.referredByUserId, userId));
}

export async function getReferralLeaderboard() {
  const db = await getDb();
  if (!db) return [];
  const referralCount = sql<number>`count(${referralRecords.id})`;
  const rows = await db
    .select({ userId: users.id, name: users.name, referralCount })
    .from(referralRecords)
    .innerJoin(users, eq(referralRecords.referrerUserId, users.id))
    .where(eq(referralRecords.status, "qualified"))
    .groupBy(users.id, users.name)
    .orderBy(desc(referralCount), asc(users.id))
    .limit(20);
  return rows.map((item, idx) => ({
    userId: item.userId,
    rank: idx + 1,
    name: item.name ? item.name.split(' ')[0] + (item.name.split(' ').length > 1 ? ' ' + item.name.split(' ')[1][0] + '.' : '') : 'Student',
    referrals: Number(item.referralCount || 0),
  }));
}

// Blog
export async function getPublishedBlogPosts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogPosts).orderBy(desc(blogPosts.publishedAt));
}

export async function getBlogPostBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
