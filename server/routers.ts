import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import {
  certificates,
  competitions,
  cohorts,
  courseLessons,
  courseModules,
  courses,
  emailNotifications,
  enrollments,
  eventRegistrations,
  lessonProgress,
  paymentTransactions,
  referralRecords,
  trainingEvents,
  users,
  waitlistEntries,
} from "../drizzle/schema";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getEventState, referralAttributionIssue, safeStudentName } from "./academy.logic";
import { initializePaystackTransaction, verifyPaystackTransaction } from "./integrations/paystack";
import { escapeEmailHtml, sendTransactionalEmail } from "./integrations/resend";
import { seedDatabase } from "./seed";

void seedDatabase();

function getRequestOrigin(req: { protocol?: string; headers: Record<string, string | string[] | undefined>; get?: (name: string) => string | undefined }) {
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const protocol = (Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol?.split(",")[0]) ?? req.protocol ?? "https";
  const host = req.get?.("host") ?? (Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host);
  if (!host) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Checkout callback URL could not be created." });
  return `${protocol}://${host}`;
}

function asMetadata(value: unknown) {
  if (typeof value === "string") {
    try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
  }
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

async function recordEnrollmentEmail(database: NonNullable<Awaited<ReturnType<typeof db.getDb>>>, input: { to: string; studentName: string | null; courseTitle: string; reference: string }) {
  const studentName = escapeEmailHtml(input.studentName?.trim() || "Student");
  const courseTitle = escapeEmailHtml(input.courseTitle);
  const subject = `You’re enrolled in ${input.courseTitle}`;
  const html = `<main style="font-family:Arial,sans-serif;color:#163c3e;max-width:600px;margin:0 auto"><p>Hi ${studentName},</p><h1>Welcome to BuduTech Academy.</h1><p>Your payment has been verified and you are now enrolled in <strong>${courseTitle}</strong>.</p><p>You can return to your student dashboard at any time to begin learning and track your progress.</p><p style="color:#607a7c;font-size:12px">Payment reference: ${escapeEmailHtml(input.reference)}</p></main>`;
  const text = `Hi ${input.studentName?.trim() || "Student"}, your payment has been verified and you are now enrolled in ${input.courseTitle}. Payment reference: ${input.reference}`;
  try {
    await sendTransactionalEmail({ to: input.to, subject, html, text, idempotencyKey: `academy-enrollment-${input.reference}` });
    await database.insert(emailNotifications).values({ recipientEmail: input.to, subject, body: text, status: "sent" });
  } catch (error) {
    await database.insert(emailNotifications).values({ recipientEmail: input.to, subject, body: `Delivery failed: ${error instanceof Error ? error.message : "Unknown delivery error"}`, status: "failed" });
  }
}

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access is required." });
  }
  return next({ ctx });
});

const courseInput = z.object({
  title: z.string().min(3).max(255),
  slug: z.string().min(3).max(255).regex(/^[a-z0-9-]+$/),
  tagline: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(750).optional(),
  category: z.string().min(2).max(100),
  instructor: z.string().min(2).max(150),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  imageUrl: z.string().url().optional(),
  published: z.boolean(),
  featured: z.boolean(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  academy: router({
    getHomeData: publicProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) return { activeEvent: null, registrationCount: 0, featuredCourses: [], leaderboard: [], recentArticles: [] };
      const activeEvent = await db.getActiveTrainingEvent();
      const registrationCount = activeEvent
        ? Number((await database.select({ count: sql<number>`count(*)` }).from(eventRegistrations).where(and(eq(eventRegistrations.eventId, activeEvent.id), eq(eventRegistrations.status, "registered"))))[0]?.count ?? 0)
        : 0;
      const featuredCourses = await database.select().from(courses).where(and(eq(courses.featured, true), eq(courses.published, true))).limit(3);
      return {
        activeEvent: activeEvent ? { ...activeEvent, state: getEventState(activeEvent) } : null,
        registrationCount,
        featuredCourses,
        leaderboard: (await db.getReferralLeaderboard()).map(({ userId: _userId, ...entry }) => entry),
        recentArticles: (await db.getPublishedBlogPosts()).slice(0, 3),
      };
    }),

    getCourses: publicProcedure.input(z.object({ category: z.string().optional() }).optional()).query(async ({ input }) => {
      const courseList = await db.getPublishedCourses();
      return input?.category && input.category !== "All" ? courseList.filter((course) => course.category === input.category) : courseList;
    }),

    getCourseBySlug: publicProcedure.input(z.object({ slug: z.string().min(1) })).query(async ({ input }) => {
      const course = await db.getCourseBySlug(input.slug);
      if (!course || !course.published) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      return { course, ...(await db.getCourseModulesAndLessons(course.id)) };
    }),

    getBlogPosts: publicProcedure.input(z.object({ search: z.string().optional(), category: z.string().optional() }).optional()).query(async ({ input }) => {
      const posts = await db.getPublishedBlogPosts();
      const query = input?.search?.trim().toLocaleLowerCase();
      return posts.filter((post) => {
        const categoryMatches = !input?.category || input.category === "All" || post.category === input.category;
        const textMatches = !query || `${post.title} ${post.summary ?? ""} ${post.category}`.toLocaleLowerCase().includes(query);
        return categoryMatches && textMatches;
      });
    }),

    getBlogPost: publicProcedure.input(z.object({ slug: z.string().min(1) })).query(async ({ input }) => {
      const post = await db.getBlogPostBySlug(input.slug);
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found." });
      return post;
    }),

    getLeaderboard: publicProcedure.query(async () => (await db.getReferralLeaderboard()).map(({ userId: _userId, ...entry }) => entry)),

    getActiveEvent: publicProcedure.query(async () => {
      const event = await db.getActiveTrainingEvent();
      return event ? { ...event, state: getEventState(event) } : null;
    }),

    registerForActiveEvent: protectedProcedure.mutation(async ({ ctx }) => {
      const database = await db.getDb();
      const event = await db.getActiveTrainingEvent();
      if (!database || !event) throw new TRPCError({ code: "NOT_FOUND", message: "There is no active training event." });
      if (event.registrationStatus !== "open") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Registration is currently closed." });
      const currentCount = Number((await database.select({ count: sql<number>`count(*)` }).from(eventRegistrations).where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.status, "registered"))))[0]?.count ?? 0);
      if (currentCount >= event.capacity) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The current training has reached capacity." });
      const existing = await database.select({ id: eventRegistrations.id }).from(eventRegistrations).where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.userId, ctx.user.id))).limit(1);
      if (!existing.length) {
        await database.insert(eventRegistrations).values({ eventId: event.id, userId: ctx.user.id, status: "registered" });
        if (ctx.user.email) await database.insert(emailNotifications).values({ recipientEmail: ctx.user.email, subject: `Registration confirmed: ${event.title}`, body: `You are registered for ${event.title}. We will share event updates with you here.`, status: "sent" });
      }
      return { success: true, eventId: event.id };
    }),

    applyReferralCode: protectedProcedure.input(z.object({ code: z.string().trim().min(4).max(32).toUpperCase() })).mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      const currentUser = (await database.select().from(users).where(eq(users.id, ctx.user.id)).limit(1))[0];
      if (!currentUser) throw new TRPCError({ code: "NOT_FOUND", message: "Student account not found." });
      const referrer = await db.getUserByReferralCode(input.code);
      const existingRecord = await database.select({ id: referralRecords.id }).from(referralRecords).where(eq(referralRecords.referredUserId, ctx.user.id)).limit(1);
      const referralIssue = referralAttributionIssue({ referrerUserId: referrer?.id ?? null, currentUserId: ctx.user.id, alreadyAttributed: Boolean(currentUser.referredByUserId), hasExistingRecord: Boolean(existingRecord.length) });
      if (referralIssue === "invalid") throw new TRPCError({ code: "NOT_FOUND", message: "This referral code is not valid." });
      if (referralIssue === "self") throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot use your own referral code." });
      if (referralIssue === "duplicate") throw new TRPCError({ code: "CONFLICT", message: "Referral attribution has already been recorded." });
      if (!referrer) throw new TRPCError({ code: "NOT_FOUND", message: "This referral code is not valid." });
      const activeEvent = await db.getActiveTrainingEvent();
      await database.transaction(async (tx) => {
        await tx.update(users).set({ referredByUserId: referrer.id }).where(eq(users.id, ctx.user.id));
        await tx.insert(referralRecords).values({ referrerUserId: referrer.id, referredUserId: ctx.user.id, eventId: activeEvent?.id ?? null, referralCode: input.code, status: "qualified", qualificationReason: "Valid registered student via referral link" });
      });
      return { success: true };
    }),

    getStudentDashboard: protectedProcedure.query(async ({ ctx }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      const [studentEnrollments, progressRows, studentCertificates, activeEvent, referralRows, leaderboard] = await Promise.all([
        database.select().from(enrollments).where(eq(enrollments.userId, ctx.user.id)),
        database.select().from(lessonProgress).where(eq(lessonProgress.userId, ctx.user.id)),
        database.select().from(certificates).where(eq(certificates.userId, ctx.user.id)),
        db.getActiveTrainingEvent(),
        database.select().from(referralRecords).where(and(eq(referralRecords.referrerUserId, ctx.user.id), eq(referralRecords.status, "qualified"))),
        db.getReferralLeaderboard(),
      ]);
      const enrolledCourses = await Promise.all(studentEnrollments.map(async (enrollment) => (await database.select().from(courses).where(eq(courses.id, enrollment.courseId)).limit(1))[0]));
      const courseProgress = await Promise.all(enrolledCourses.filter(Boolean).map(async (course) => {
        const lessons = await database.select({ id: courseLessons.id }).from(courseLessons).where(eq(courseLessons.courseId, course.id)).orderBy(courseLessons.sortOrder);
        const completedLessons = progressRows.filter((row) => row.completed && lessons.some((lesson) => lesson.id === row.lessonId)).length;
        return { course, firstLessonId: lessons[0]?.id ?? null, completedLessons, totalLessons: lessons.length, percent: lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0 };
      }));
      const currentRegistration = activeEvent ? await database.select({ id: eventRegistrations.id }).from(eventRegistrations).where(and(eq(eventRegistrations.eventId, activeEvent.id), eq(eventRegistrations.userId, ctx.user.id), eq(eventRegistrations.status, "registered"))).limit(1) : [];
      return {
        user: ctx.user,
        courseProgress,
        certificates: studentCertificates,
        referral: { code: ctx.user.referralCode ?? null, url: ctx.user.referralCode ? `/register?ref=${ctx.user.referralCode}` : null, qualifiedCount: referralRows.length, leaderboardPosition: leaderboard.find((entry) => entry.userId === ctx.user.id)?.rank ?? null },
        activeEvent: activeEvent ? { ...activeEvent, state: getEventState(activeEvent), registered: Boolean(currentRegistration.length) } : null,
      };
    }),

    getLessonDetail: protectedProcedure.input(z.object({ lessonId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      const lesson = (await database.select().from(courseLessons).where(eq(courseLessons.id, input.lessonId)).limit(1))[0];
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found." });
      const enrolled = await database.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.userId, ctx.user.id), eq(enrollments.courseId, lesson.courseId))).limit(1);
      if (!enrolled.length) throw new TRPCError({ code: "FORBIDDEN", message: "Enroll in this course to continue learning." });
      const progress = (await database.select().from(lessonProgress).where(and(eq(lessonProgress.userId, ctx.user.id), eq(lessonProgress.lessonId, input.lessonId))).limit(1))[0];
      return { lesson, completed: progress?.completed ?? false };
    }),

    toggleLessonComplete: protectedProcedure.input(z.object({ lessonId: z.number().int().positive(), completed: z.boolean() })).mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      const lesson = (await database.select().from(courseLessons).where(eq(courseLessons.id, input.lessonId)).limit(1))[0];
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found." });
      const enrolled = await database.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.userId, ctx.user.id), eq(enrollments.courseId, lesson.courseId))).limit(1);
      if (!enrolled.length) throw new TRPCError({ code: "FORBIDDEN", message: "Enroll in this course to update progress." });
      const existing = await database.select({ id: lessonProgress.id }).from(lessonProgress).where(and(eq(lessonProgress.userId, ctx.user.id), eq(lessonProgress.lessonId, input.lessonId))).limit(1);
      if (existing.length) await database.update(lessonProgress).set({ completed: input.completed, completedAt: input.completed ? new Date() : null }).where(eq(lessonProgress.id, existing[0].id));
      else await database.insert(lessonProgress).values({ userId: ctx.user.id, lessonId: input.lessonId, completed: input.completed, completedAt: input.completed ? new Date() : null });

      if (input.completed) {
        const courseLessonsList = await database.select({ id: courseLessons.id }).from(courseLessons).where(eq(courseLessons.courseId, lesson.courseId));
        const courseProgressRows = await database.select({ lessonId: lessonProgress.lessonId, completed: lessonProgress.completed }).from(lessonProgress).where(eq(lessonProgress.userId, ctx.user.id));
        const isCourseComplete = courseLessonsList.length > 0 && courseLessonsList.every((courseLesson) => courseProgressRows.some((progress) => progress.lessonId === courseLesson.id && progress.completed));
        if (isCourseComplete) {
          const existingCertificate = await database.select({ id: certificates.id }).from(certificates).where(and(eq(certificates.userId, ctx.user.id), eq(certificates.courseId, lesson.courseId))).limit(1);
          if (!existingCertificate.length) {
            await database.insert(certificates).values({ userId: ctx.user.id, courseId: lesson.courseId, certificateCode: `BTA-${nanoid(10).toUpperCase()}` });
            await database.update(enrollments).set({ status: "completed" }).where(and(eq(enrollments.userId, ctx.user.id), eq(enrollments.courseId, lesson.courseId)));
          }
        }
      }
      return { success: true };
    }),

    getCertificate: publicProcedure.input(z.object({ code: z.string().min(4).max(64) })).query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      const certificate = (await database.select().from(certificates).where(eq(certificates.certificateCode, input.code)).limit(1))[0];
      if (!certificate) throw new TRPCError({ code: "NOT_FOUND", message: "Certificate not found." });
      const [student, course] = await Promise.all([
        database.select({ name: users.name }).from(users).where(eq(users.id, certificate.userId)).limit(1),
        database.select({ title: courses.title }).from(courses).where(eq(courses.id, certificate.courseId)).limit(1),
      ]);
      return { code: certificate.certificateCode, issuedAt: certificate.issuedAt, studentName: student[0]?.name ?? "BuduTech Student", courseTitle: course[0]?.title ?? "BuduTech Academy Program" };
    }),

    enrollFreeCourse: protectedProcedure.input(z.object({ courseId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      const course = (await database.select().from(courses).where(eq(courses.id, input.courseId)).limit(1))[0];
      if (!course || !course.published) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      if (Number(course.price) > 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This course requires payment configuration." });
      const existing = await database.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.userId, ctx.user.id), eq(enrollments.courseId, input.courseId))).limit(1);
      if (!existing.length) await database.insert(enrollments).values({ userId: ctx.user.id, courseId: input.courseId, status: "active", amountPaid: "0.00" });
      return { success: true };
    }),

    startPaidCourseCheckout: protectedProcedure.input(z.object({ courseId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      const [courseRows, studentRows] = await Promise.all([
        database.select().from(courses).where(eq(courses.id, input.courseId)).limit(1),
        database.select().from(users).where(eq(users.id, ctx.user.id)).limit(1),
      ]);
      const course = courseRows[0];
      const student = studentRows[0];
      if (!course || !course.published) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      if (Number(course.price) <= 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This course is available without payment." });
      if (!student?.email) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "An email address is required to begin checkout." });
      const existingEnrollment = await database.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.userId, ctx.user.id), eq(enrollments.courseId, input.courseId))).limit(1);
      if (existingEnrollment.length) return { alreadyEnrolled: true as const, authorizationUrl: null, reference: null };
      const amountKobo = Math.round(Number(course.price) * 100);
      const reference = `bta-${input.courseId}-${ctx.user.id}-${nanoid(14)}`;
      await database.insert(paymentTransactions).values({ reference, userId: ctx.user.id, courseId: input.courseId, amountKobo, status: "initialized" });
      try {
        const callbackUrl = `${getRequestOrigin(ctx.req)}/checkout/verify?reference=${encodeURIComponent(reference)}`;
        const initialized = await initializePaystackTransaction({ email: student.email, amountKobo, reference, callbackUrl, courseId: input.courseId, userId: ctx.user.id });
        await database.update(paymentTransactions).set({ authorizationUrl: initialized.authorization_url }).where(eq(paymentTransactions.reference, reference));
        return { alreadyEnrolled: false as const, authorizationUrl: initialized.authorization_url, reference };
      } catch (error) {
        await database.update(paymentTransactions).set({ status: "failed" }).where(eq(paymentTransactions.reference, reference));
        throw new TRPCError({ code: "BAD_GATEWAY", message: error instanceof Error ? error.message : "Could not initialize payment." });
      }
    }),

    verifyPaidCourseCheckout: protectedProcedure.input(z.object({ reference: z.string().trim().min(8).max(128) })).mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      const transaction = (await database.select().from(paymentTransactions).where(and(eq(paymentTransactions.reference, input.reference), eq(paymentTransactions.userId, ctx.user.id))).limit(1))[0];
      if (!transaction) throw new TRPCError({ code: "NOT_FOUND", message: "Payment transaction not found." });
      if (transaction.status === "paid") return { success: true, courseId: transaction.courseId, alreadyVerified: true };
      try {
        const verification = await verifyPaystackTransaction(transaction.reference);
        const metadata = asMetadata(verification.metadata);
        const valid = verification.status === "success" && verification.reference === transaction.reference && verification.amount === transaction.amountKobo && verification.currency === transaction.currency && Number(metadata.courseId) === transaction.courseId && Number(metadata.userId) === ctx.user.id;
        if (!valid) {
          await database.update(paymentTransactions).set({ status: "failed" }).where(eq(paymentTransactions.id, transaction.id));
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payment could not be verified for this course." });
        }
        const existingEnrollment = await database.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.userId, ctx.user.id), eq(enrollments.courseId, transaction.courseId))).limit(1);
        if (!existingEnrollment.length) await database.insert(enrollments).values({ userId: ctx.user.id, courseId: transaction.courseId, status: "active", paymentReference: transaction.reference, amountPaid: (transaction.amountKobo / 100).toFixed(2) });
        await database.update(paymentTransactions).set({ status: "paid", verifiedAt: new Date() }).where(eq(paymentTransactions.id, transaction.id));
        const [studentRows, courseRows] = await Promise.all([
          database.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, ctx.user.id)).limit(1),
          database.select({ title: courses.title }).from(courses).where(eq(courses.id, transaction.courseId)).limit(1),
        ]);
        if (studentRows[0]?.email && courseRows[0]) await recordEnrollmentEmail(database, { to: studentRows[0].email, studentName: studentRows[0].name, courseTitle: courseRows[0].title, reference: transaction.reference });
        return { success: true, courseId: transaction.courseId, alreadyVerified: false };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "BAD_GATEWAY", message: error instanceof Error ? error.message : "Payment verification failed." });
      }
    }),

    joinWaitlist: publicProcedure.input(z.object({ fullName: z.string().trim().min(2).max(150), email: z.string().email(), phone: z.string().trim().max(50).optional(), courseId: z.number().int().positive().optional(), eventId: z.number().int().positive().optional() }).refine((input) => input.courseId || input.eventId, { message: "Choose a course or event." })).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      await database.insert(waitlistEntries).values({ fullName: input.fullName, email: input.email, phone: input.phone ?? null, courseId: input.courseId ?? null, eventId: input.eventId ?? null, status: "pending" });
      return { success: true };
    }),

    adminStats: adminProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) return { studentsCount: 0, enrollmentCount: 0, courseCount: 0, registrationCount: 0, referralCount: 0, revenue: "0.00" };
      const [studentTotal, enrollmentTotal, courseTotal, registrationTotal, referralTotal, revenueTotal] = await Promise.all([
        database.select({ count: sql<number>`count(*)` }).from(users),
        database.select({ count: sql<number>`count(*)` }).from(enrollments),
        database.select({ count: sql<number>`count(*)` }).from(courses),
        database.select({ count: sql<number>`count(*)` }).from(eventRegistrations).where(eq(eventRegistrations.status, "registered")),
        database.select({ count: sql<number>`count(*)` }).from(referralRecords).where(eq(referralRecords.status, "qualified")),
        database.select({ amount: sql<string>`coalesce(sum(${enrollments.amountPaid}), 0)` }).from(enrollments),
      ]);
      return { studentsCount: Number(studentTotal[0]?.count ?? 0), enrollmentCount: Number(enrollmentTotal[0]?.count ?? 0), courseCount: Number(courseTotal[0]?.count ?? 0), registrationCount: Number(registrationTotal[0]?.count ?? 0), referralCount: Number(referralTotal[0]?.count ?? 0), revenue: revenueTotal[0]?.amount ?? "0.00" };
    }),

    adminCourses: adminProcedure.query(() => db.getAllCoursesAdmin()),
    adminCreateCourse: adminProcedure.input(courseInput).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      const duplicate = await database.select({ id: courses.id }).from(courses).where(eq(courses.slug, input.slug)).limit(1);
      if (duplicate.length) throw new TRPCError({ code: "CONFLICT", message: "A course already uses this URL slug." });
      await database.insert(courses).values(input);
      return { success: true };
    }),

    adminCourseContent: adminProcedure.input(z.object({ courseId: z.number().int().positive() })).query(async ({ input }) => {
      const course = (await db.getCourseModulesAndLessons(input.courseId));
      return course;
    }),

    adminCreateModule: adminProcedure.input(z.object({ courseId: z.number().int().positive(), title: z.string().trim().min(2).max(255), sortOrder: z.number().int().min(0) })).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      await database.insert(courseModules).values(input);
      return { success: true };
    }),

    adminCreateLesson: adminProcedure.input(z.object({ courseId: z.number().int().positive(), moduleId: z.number().int().positive().nullable(), title: z.string().trim().min(2).max(255), sortOrder: z.number().int().min(0), contentType: z.enum(["video", "text"]), videoUrl: z.string().url().optional(), contentHtml: z.string().max(30000).optional(), durationMinutes: z.number().int().positive().max(1440) }).refine((input) => input.contentType !== "video" || Boolean(input.videoUrl), { message: "Video lessons require a video URL." })).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      await database.insert(courseLessons).values({ ...input, moduleId: input.moduleId ?? null, slug: `${input.courseId}-${nanoid(8)}` });
      return { success: true };
    }),

    adminCohorts: adminProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) return [];
      return database.select().from(cohorts).orderBy(sql`${cohorts.createdAt} desc`);
    }),

    adminCreateCohort: adminProcedure.input(z.object({ courseId: z.number().int().positive(), name: z.string().trim().min(2).max(255), startDate: z.date().nullable(), endDate: z.date().nullable(), capacity: z.number().int().positive().max(100000), status: z.enum(["open", "active", "closed"]) })).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      await database.insert(cohorts).values(input);
      return { success: true };
    }),

    adminCreateEvent: adminProcedure.input(z.object({ title: z.string().min(3).max(255), description: z.string().max(5000).optional(), startDate: z.date(), startTime: z.string().min(1).max(50), timeZone: z.string().min(1).max(50), capacity: z.number().int().positive(), youtubeLiveUrl: z.string().url().optional(), replayUrl: z.string().url().optional(), replayMode: z.enum(["free", "paid", "restricted", "unavailable"]), registrationStatus: z.enum(["open", "closed", "completed"]), activeCampaign: z.boolean(), prizeDescription: z.string().max(1000).optional() })).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      if (input.activeCampaign) await database.update(trainingEvents).set({ activeCampaign: false }).where(eq(trainingEvents.activeCampaign, true));
      await database.insert(trainingEvents).values({ ...input, replayAvailable: Boolean(input.replayUrl) });
      return { success: true };
    }),

    adminUpdateEvent: adminProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().min(3).max(255), description: z.string().max(5000).nullable(), startDate: z.date(), startTime: z.string().min(1).max(50), timeZone: z.string().min(1).max(50), capacity: z.number().int().positive(), youtubeLiveUrl: z.string().url().nullable(), replayUrl: z.string().url().nullable(), replayMode: z.enum(["free", "paid", "restricted", "unavailable"]), replayAvailable: z.boolean(), registrationStatus: z.enum(["open", "closed", "completed"]), activeCampaign: z.boolean(), prizeDescription: z.string().max(1000).nullable() })).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      if (input.activeCampaign) await database.update(trainingEvents).set({ activeCampaign: false }).where(and(eq(trainingEvents.activeCampaign, true), sql`${trainingEvents.id} != ${input.id}`));
      await database.update(trainingEvents).set(input).where(eq(trainingEvents.id, input.id));
      return { success: true };
    }),

    adminCompetition: adminProcedure.query(async () => {
      const database = await db.getDb();
      return database ? database.select().from(competitions).orderBy(sql`${competitions.createdAt} desc`) : [];
    }),

    adminCreateCompetition: adminProcedure.input(z.object({ title: z.string().trim().min(3).max(255), description: z.string().max(5000).optional(), eventId: z.number().int().positive().nullable(), startDate: z.date().nullable(), endDate: z.date().nullable(), qualificationRules: z.string().max(5000).optional(), status: z.enum(["active", "ended", "draft"]) })).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      await database.insert(competitions).values(input);
      return { success: true };
    }),

    adminStudents: adminProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) return [];
      return database.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, referralCode: users.referralCode }).from(users).orderBy(sql`${users.createdAt} desc`).limit(100);
    }),

    adminReferralRecords: adminProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) return [];
      const records = await database.select().from(referralRecords).orderBy(sql`${referralRecords.createdAt} desc`).limit(100);
      const memberRows = await database.select({ id: users.id, name: users.name }).from(users);
      return records.map((record) => ({ ...record, referrerName: safeStudentName(memberRows.find((member) => member.id === record.referrerUserId)?.name ?? null), referredName: safeStudentName(memberRows.find((member) => member.id === record.referredUserId)?.name ?? null) }));
    }),

    adminSendBroadcast: adminProcedure.input(z.object({ subject: z.string().trim().min(3).max(255), body: z.string().trim().min(3).max(10000) })).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The database is unavailable." });
      const recipients = await database.select({ email: users.email }).from(users).where(sql`${users.email} is not null`);
      const html = `<main style="font-family:Arial,sans-serif;color:#163c3e;max-width:600px;margin:0 auto"><h1>${escapeEmailHtml(input.subject)}</h1><p style="line-height:1.7">${escapeEmailHtml(input.body).replace(/\n/g, "<br />")}</p></main>`;
      let sentCount = 0;
      let failedCount = 0;
      for (let index = 0; index < recipients.length; index += 8) {
        const batch = recipients.slice(index, index + 8);
        const results = await Promise.all(batch.map(async (recipient, offset) => {
          const email = recipient.email!;
          try {
            await sendTransactionalEmail({ to: email, subject: input.subject, html, text: input.body, idempotencyKey: `academy-broadcast-${Date.now()}-${index + offset}-${email}` });
            await database.insert(emailNotifications).values({ recipientEmail: email, subject: input.subject, body: input.body, status: "sent" });
            return "sent" as const;
          } catch (error) {
            await database.insert(emailNotifications).values({ recipientEmail: email, subject: input.subject, body: `Delivery failed: ${error instanceof Error ? error.message : "Unknown delivery error"}`, status: "failed" });
            return "failed" as const;
          }
        }));
        sentCount += results.filter((result) => result === "sent").length;
        failedCount += results.filter((result) => result === "failed").length;
        if (index + 8 < recipients.length) await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      return { success: failedCount === 0, recipientCount: recipients.length, sentCount, failedCount };
    }),
  }),
});

export type AppRouter = typeof appRouter;
