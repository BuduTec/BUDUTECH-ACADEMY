import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: role === "admin" ? 99 : 1,
    openId: role === "admin" ? "admin-openid" : "student-openid",
    email: role === "admin" ? "admin@budutech.academy" : "student@example.com",
    name: role === "admin" ? "Academy Admin" : "Test Student",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      get: () => "localhost:3000",
    } as unknown as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("BuduTech Academy LMS Integration Procedures", () => {
  it("allows unauthenticated public callers to view courses and active events", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {}, get: () => "localhost:3000" } as unknown as TrpcContext["req"],
      res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    const coursesList = await caller.academy.getCourses();
    expect(Array.isArray(coursesList)).toBe(true);
    expect(coursesList.length).toBeGreaterThan(0);

    const activeEvent = await caller.academy.getActiveEvent();
    expect(activeEvent).toBeDefined();
  });

  it("allows student to fetch their dashboard and leaderboard", async () => {
    const ctx = createMockContext("user");
    const caller = appRouter.createCaller(ctx);

    const dashboard = await caller.academy.getStudentDashboard();
    expect(dashboard).toBeDefined();
    expect(dashboard.user).toBeDefined();
    expect(Array.isArray(dashboard.enrollments)).toBe(true);

    const leaderboard = await caller.academy.getLeaderboard();
    expect(Array.isArray(leaderboard)).toBe(true);
  });

  it("enforces role-based access control for admin statistics and courses", async () => {
    const studentCtx = createMockContext("user");
    const studentCaller = appRouter.createCaller(studentCtx);

    await expect(studentCaller.academy.adminStats()).rejects.toThrow();

    const adminCtx = createMockContext("admin");
    const adminCaller = appRouter.createCaller(adminCtx);

    const stats = await adminCaller.academy.adminStats();
    expect(stats).toBeDefined();
    expect(typeof stats.studentsCount).toBe("number");
    expect(typeof stats.revenue).toBe("string");

    const adminCourses = await adminCaller.academy.adminCourses();
    expect(Array.isArray(adminCourses)).toBe(true);
  });
});
