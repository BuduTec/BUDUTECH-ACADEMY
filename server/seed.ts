import { getDb } from "./db";
import { courses, trainingEvents, blogPosts, courseModules, courseLessons } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  const db = await getDb();
  if (!db) return;

  try {
    // Check if training event exists
    const events = await db.select().from(trainingEvents).limit(1);
    if (events.length === 0) {
      await db.insert(trainingEvents).values({
        title: "Building Websites for Businesses: Live Masterclass & Training",
        description: "Learn how to build high-converting business websites from scratch, master modern web workflows, and launch your digital career. Join live with Q&A.",
        startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        startTime: "7:00 PM WAT",
        timeZone: "WAT (West Africa Time)",
        registrationStatus: "open",
        capacity: 1000,
        youtubeLiveUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        replayAvailable: false,
        replayMode: "free",
        activeCampaign: true,
        prizeDescription: "Win $500 cash prize & 1-on-1 mentorship for the top qualified referrer!",
      });
      console.log("[Seed] Training event created.");
    }

    // Check if sample course exists
    const existingCourses = await db.select().from(courses).limit(1);
    if (existingCourses.length === 0) {
      const courseIdRes = await db.insert(courses).values({
        title: "Building Business Websites for Profit",
        slug: "building-business-websites-for-profit",
        tagline: "Master HTML, CSS, modern landing pages, and client acquisition in 4 weeks.",
        description: "A comprehensive, practical course designed for aspiring tech entrepreneurs and digital creators in Africa. Learn how to craft professional business websites that convert visitors into paying clients.",
        shortDescription: "Build your first professional business website and start earning as a freelance web creator.",
        category: "Web Development",
        instructor: "BuduTech Academy Faculty",
        price: "0.00",
        level: "Beginner",
        published: true,
        featured: true,
        imageUrl: "/manus-storage/budutech-hero-workspace_7006b24f.jpg",
      });

      const courseId = Number(courseIdRes[0].insertId);

      // Add modules
      const mod1Res = await db.insert(courseModules).values({
        courseId,
        title: "Module 1: Foundations of Modern Web Design",
        sortOrder: 1,
      });
      const mod1Id = Number(mod1Res[0].insertId);

      await db.insert(courseLessons).values([
        {
          courseId,
          moduleId: mod1Id,
          title: "Welcome to BuduTech Academy & Roadmap",
          slug: "welcome-and-roadmap",
          sortOrder: 1,
          contentType: "video",
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          contentHtml: "<h3>Welcome!</h3><p>In this lesson, we cover what you will achieve throughout the academy and how to set up your workspace.</p>",
          durationMinutes: 15,
        },
        {
          courseId,
          moduleId: mod1Id,
          title: "Understanding HTML Layouts & Semantic Elements",
          slug: "understanding-html-layouts",
          sortOrder: 2,
          contentType: "video",
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          contentHtml: "<h3>HTML Semantics</h3><p>Learn how clean markup forms the backbone of every professional business website.</p>",
          durationMinutes: 25,
        }
      ]);

      console.log("[Seed] Sample course and lessons created.");
    }

    // Check blog posts
    const existingBlog = await db.select().from(blogPosts).limit(1);
    if (existingBlog.length === 0) {
      await db.insert(blogPosts).values({
        title: "Why Every Local Business Needs a High-Converting Website in 2026",
        slug: "why-every-local-business-needs-website-2026",
        category: "Business Technology",
        summary: "Discover how establishing an online presence transforms local service businesses into thriving digital brands.",
        contentHtml: "<p>Physical storefronts are no longer enough. Modern customers research online before making purchasing decisions...</p>",
        authorName: "BuduTech Editorial",
        publishedAt: new Date(),
      });
      console.log("[Seed] Sample blog post created.");
    }
  } catch (err) {
    console.error("[Seed] Error seeding database:", err);
  }
}
