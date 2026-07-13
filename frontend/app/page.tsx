/**
 * Root route handler for `/`.
 *
 * Why this file exists alongside app/(dashboard)/page.tsx:
 * Next.js App Router gives app/page.tsx priority over app/(group)/page.tsx
 * for the root `/` path. So this file MUST render the full dashboard shell.
 *
 * Pattern used: Server Component (this file) renders a Client Component
 * (DashboardLayout) and passes a Server Component (OverviewPage) as children.
 * This is the canonical Next.js cross-boundary composition pattern.
 */
import DashboardLayout from "./(dashboard)/layout";
import OverviewPage from "./(dashboard)/page";

export default function RootPage() {
  return (
    <DashboardLayout>
      <OverviewPage />
    </DashboardLayout>
  );
}
