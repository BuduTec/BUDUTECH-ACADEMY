# Project TODO

## Foundation and core LMS

- [ ] Authentication flow with login, registration, protected student access, referral attribution, and role enforcement
- [ ] Data-driven course catalog with category filters and `/courses/[slug]` detail pages
- [ ] Course hierarchy with admin-managed courses, modules, lessons, ordering, publishing, featured state, and archive visibility
- [ ] Lesson player with YouTube/Vimeo embeds, text content, resources, and per-lesson progress
- [ ] Student dashboard with continue learning, enrolled courses, progress, certificates, upcoming events, announcements, and referrals
- [ ] Enrollment, cohorts, waitlist, free access, paid access, replay access rules, checkout foundation, and payment verification boundaries
- [ ] Completion certificates with viewable and downloadable presentation
- [ ] Blog and categorized resources with search

## BuduTech Academy launch campaign

- [ ] Configurable live training/event object with title, description, date, time, timezone, capacity, registration state, YouTube Live URL, replay URL, replay state, and campaign status
- [ ] Dynamic homepage capable of promoting the Academy, featured courses, active campaign, upcoming events, learning opportunities, and future offers
- [ ] Timezone-correct countdown with pre-event, live, replay-available, and replay-unavailable states
- [ ] Database-backed registration counters with no fabricated totals or scarcity
- [ ] Unique referral codes and URLs for every registered student
- [ ] Server-validated referral attribution with invalid, self-referral, duplicate-credit, and qualified-referral handling
- [ ] Mobile-first referral dashboard with copy/share actions and WhatsApp-friendly sharing
- [ ] Public safe leaderboard with deterministic ties and no private fields
- [ ] Campaign competition/prize configuration, ranking, referral inspection, and winner verification support
- [ ] Campaign communication lifecycle using the existing notification architecture
- [ ] Admin campaign controls for event details, dates, URLs, registration, capacity, replay, prize, and messaging

## Admin and analytics

- [ ] Unified admin control center for courses, modules, lessons, cohorts, events, students, referrals, competitions, communications, and analytics
- [ ] Actual-record analytics for registrations, event registrations, referrals, qualified referrals, replay access, paid conversions, revenue, enrollments, and completion
- [ ] Admin-created future courses without source-code changes
- [ ] Safe deletion/archive and audit-friendly management rules

## Security and integrations

- [ ] Server-side authorization for admin mutations and private student records
- [ ] Server-side referral and payment validation; no client-controlled counts or access grants
- [ ] Public leaderboard privacy filtering
- [ ] Configurable email provider and payment provider boundaries without exposing secrets to the browser
- [x] Integrate Paystack checkout initialization and server-side transaction verification for paid course enrollment
- [x] Integrate Resend transactional email delivery for enrollment confirmations and campaign communications
- [x] Add and validate Paystack and Resend credentials through secure project configuration
- [ ] Deployment/domain configuration for `academy.budutech.app` documented and validated
- [ ] Resolve ambiguities before implementation: qualified referral definition, attendance tracking scope, payment provider, email provider, replay rules, and deployment target

## Quality gates

- [ ] Vitest coverage for auth, referral attribution, enrollment, progress, and admin authorization
- [ ] Type-check, test suite, and production build pass
- [ ] Browser verification of public, student, and admin flows
- [ ] Mobile verification of registration, catalog, dashboard, referrals, and lesson player
- [ ] No fabricated testimonials, ratings, registration counts, scarcity, rankings, revenue, or analytics
- [ ] Final project checkpoint saved only after all required launch-scope items are verified

## Domain model

- `users`
- `courses`
- `courseModules`
- `courseLessons`
- `trainingEvents`
- `cohorts`
- `enrollments`
- `lessonProgress`
- `certificates`
- `waitlistEntries`
- `referralRecords` (to be added for traceable attribution and qualification)
- `competitions` (to be added for campaign prize configuration)
- `blogPosts`
- `emailNotifications`

## Change history

- Initial LMS scope captured from the user request.
- Repository audit completed against the initial scaffold.
- BuduTech Academy build brief received and reconciled as an additive product and campaign specification.
- Existing implementation work requires compliance review before further feature expansion.

## Implementation notes

Use the existing React 19, Tailwind 4, Express 4, tRPC 11, Drizzle, and Manus Auth architecture. Keep the homepage, courses, campaigns, and referrals data-driven. Store file bytes in S3-backed storage. Do not seed or fabricate user-generated claims. Use real database records for counters, rankings, analytics, and access decisions.

## QA checklist

- [ ] No broken routes or dead-end navigation
- [ ] Authenticated and unauthenticated states render correctly
- [ ] Verify authenticated student dashboard access, lesson progress updates, referral sharing, Admin actions, and paid-checkout return handling end to end
- [ ] Verify narrow-width dashboard, referral, and lesson-player flows on mobile before final checkpoint
- [ ] Referral attribution persists exactly once and cannot be self-awarded
- [ ] Progress updates persist and are scoped to the current student
- [ ] Admin-only actions are protected server-side
- [ ] Checkout and waitlist validation handle errors clearly
- [ ] Event transitions and replay states use persisted configuration
- [ ] Email failures do not corrupt enrollment state
- [ ] Mobile layouts remain usable at narrow widths
- [ ] All completed items are marked `[x]` before checkpoint

## Current implementation review flags

- [ ] Replace any fallback/fabricated registration count with a neutral empty state when the database has zero records
- [ ] Replace any simulated revenue or analytics values with database-derived values or explicit unavailable states
- [ ] Add persisted referral records and qualification logic instead of inferring only from `users.referredByUserId`
- [ ] Add competition/prize persistence instead of storing only a free-form event prize description
- [ ] Add configurable event registration and replay access rules
- [ ] Audit all current routers for real admin persistence, safe error handling, and security boundaries
- [ ] Add frontend routes and UI; the current scaffold is not yet a finished LMS
- [x] Add a Vercel-compatible serverless API entrypoint and SPA rewrite configuration to resolve the production 404.
- [ ] Redeploy on Vercel after the serverless routing change and verify both the Vercel URL and academy.budutech.app no longer return 404.
- [ ] Smoke-test live Vercel routes: `/`, `/courses`, `/dashboard`, `/api/trpc`, and the OAuth callback path.
- [ ] Confirm required Vercel environment variables and domain/DNS assignment after the live deployment succeeds.

## Brief acceptance criteria

- [ ] A visitor can register for the active live training and obtain a student account
- [ ] Registration count, event date, countdown, and campaign URLs come from persisted configuration
- [ ] A student receives a unique referral URL and can share it on mobile
- [ ] Referred registrations are attributed exactly once and reflected in qualified rankings
- [ ] Students can see their referral count and rank; public views expose safe fields only
- [ ] Admin can manage the event, courses, modules, lessons, students, referrals, communications, and analytics without source-code changes
- [ ] Replay availability follows its configured access rule after the live event
- [ ] A future course can be created from Admin without modifying source code
- [x] Type checks, tests, browser checks, and mobile verification pass before checkpoint

## Status

- [ ] Current project is not yet ready for launch; implementation continues from the reconciled plan.
- [ ] Save a new checkpoint only after implementation and verification are complete.
- [ ] Implement the first integrated Academy interface across public, student, and Admin routes using the data-driven tRPC foundation.

## Automated Integration Verification
- [ ] Create server-side tRPC integration tests for student enrollment, lesson progress, and admin procedures
- [ ] Execute vitest and confirm all procedures and security checks pass successfully
- [ ] Save project checkpoint and prepare final deliverables
