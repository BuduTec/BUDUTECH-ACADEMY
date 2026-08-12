# Comprehensive Implementation Plan: Custom Learning Management System (LMS)

This implementation plan outlines the exact architectural blueprint, database schema, backend routers, frontend routes, and component hierarchy to transform the base repository into a polished, full-featured online course platform.

---

## 1. Domain Model & Database Schema (`drizzle/schema.ts`)

We will add 9 dedicated tables to support all required LMS features without relying on external third-party LMS services:

1. **`courses`**:
   - `id` (serial primary key), `title`, `slug`, `tagline`, `description`, `category` (e.g. "AI & Automation", "Business Growth", "Career & Freelance"), `price` (decimal/integer cents), `level` ("Beginner", "Intermediate", "Advanced"), `imageUrl`, `published` (boolean), `createdAt`, `updatedAt`.
2. **`course_lessons`**:
   - `id` (serial primary key), `courseId` (fk), `title`, `slug`, `sortOrder` (integer), `contentType` ("video" | "text"), `videoUrl` (YouTube / Vimeo embed URL or ID), `contentHtml` (rich text/markdown), `durationMinutes`, `createdAt`.
3. **`cohorts`**:
   - `id` (serial primary key), `courseId` (fk), `name` ("Cohort 7 - August 2026"), `startDate`, `endDate`, `capacity`, `status` ("open" | "active" | "closed"), `createdAt`.
4. **`enrollments`**:
   - `id` (serial primary key), `userId` (fk), `courseId` (fk), `cohortId` (fk, optional), `status` ("active" | "completed" | "refunded"), `paymentReference`, `amountPaid`, `enrolledAt`.
5. **`lesson_progress`**:
   - `id` (serial primary key), `userId` (fk), `lessonId` (fk), `completed` (boolean), `completedAt`, `updatedAt`.
6. **`certificates`**:
   - `id` (serial primary key), `userId` (fk), `courseId` (fk), `certificateCode` (unique alpha-numeric string), `issuedAt`, `pdfUrl`.
7. **`waitlist_entries`**:
   - `id` (serial primary key), `courseId` (fk), `cohortId` (fk, optional), `fullName`, `email`, `phone`, `status` ("pending" | "notified"), `createdAt`.
8. **`blog_posts`**:
   - `id` (serial primary key), `title`, `slug`, `category`, `tags` (json/text), `coverImage`, `summary`, `contentHtml`, `authorName`, `publishedAt`.
9. **`email_notifications`**:
   - `id` (serial primary key), `recipientEmail`, `subject`, `body`, `status` ("sent" | "failed"), `sentAt`.

---

## 2. Backend tRPC Procedures (`server/routers.ts` & modular routers)

We will structure our tRPC routers into clean, testable sub-routers:

- **`coursesRouter`**:
  - `list`: Public query returning published courses with search/category filters.
  - `getBySlug`: Public query fetching course details, ordered lessons, and active cohorts.
  - `adminCreate`, `adminUpdate`, `adminDelete`: Protected admin procedures for course management.
- **`lessonsRouter`**:
  - `getByCourse`: Protected query returning lessons and student progress.
  - `markComplete`: Protected mutation toggling completion status and auto-generating certificates upon 100% completion.
  - `adminUpsert`: Protected admin procedure for creating/editing lessons.
- **`enrollmentRouter`**:
  - `checkout`: Public/Protected mutation handling enrollment creation, payment verification, and triggering confirmation email notifications.
  - `joinWaitlist`: Public mutation adding prospective students to cohort waitlists.
  - `myEnrollments`: Protected query returning courses the student is enrolled in with progress stats.
- **`adminRouter`**:
  - `stats`: Protected admin query returning total students, active enrollments, revenue, and completion rates.
  - `listStudents`: Protected admin query listing all registered users and their enrollments.
  - `sendAnnouncement`: Protected admin mutation dispatching broadcast emails to enrolled students.
- **`blogRouter`**:
  - `list`: Public query with category and search filtering.
  - `getBySlug`: Public query for article reading view.

---

## 3. Frontend Pages & Component Hierarchy (`client/src/pages/` & `components/`)

- **Public Marketing & Catalog**:
  - `Home.tsx`: High-conversion landing page with Hero section, Alumni proof counters, Course Overview, Interactive Curriculum Accordion, Testimonials carousel, Refined Pricing cards, and FAQ accordion.
  - `Catalog.tsx`: Filterable course directory with category tabs and search bar.
  - `CourseDetail.tsx`: Deep-dive course sales and syllabus page with CTA to enroll or join waitlist.
  - `Blog.tsx` & `BlogPost.tsx`: Resource hub with category browsing and article reading.
- **Student Portal**:
  - `Dashboard.tsx`: Enrolled courses with progress bars, upcoming live session reminders, and viewable certificates.
  - `LessonPlayer.tsx`: Immersive distraction-free learning interface featuring responsive YouTube/Vimeo video embed player, text content tab, collapsible sidebar lesson tree with checkmarks, and "Mark Complete & Next Lesson" button.
  - `CertificateView.tsx`: Elegant printable/downloadable certificate modal with verification code.
- **Checkout & Waitlist**:
  - `Checkout.tsx`: Secure enrollment wizard supporting cohort selection, currency toggle (USD / NGN), and simulated/real Flutterwave/Paystack checkout integration.
  - `WaitlistModal.tsx`: Fast waitlist signup popup.
- **Admin Management Panel**:
  - `AdminDashboard.tsx`: Tabbed management console for Courses, Lessons, Cohorts, Students, and Email Broadcasts.

---

## 4. Verification & Quality Assurance

- **Unit Tests (`server/*.test.ts`)**: Vitest specs covering enrollment creation, lesson progress tracking, and admin authorization guards.
- **Type Checking**: Strict TypeScript validation across client and server.
- **Visual Verification**: Responsive layout check across desktop and mobile viewports.
