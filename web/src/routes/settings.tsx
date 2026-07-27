import { createFileRoute } from "@tanstack/react-router";

import { ProtectedRoute } from "@/components/common/providers/ProtectedRoute";
import { Button } from "@/components/common/ui/Button";
import { Card } from "@/components/common/ui/Card";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { AdultContentPreference } from "@/components/pages/SettingsPage/AdultContentPreference";
import { DynamicCollectionsPreference } from "@/components/pages/SettingsPage/DynamicCollectionsPreference";
import { useAuth } from "@/hooks/useAuth";
import { requireAuthenticatedSession } from "@/lib/auth/protected-route";

export const Route = createFileRoute("/settings")({
  beforeLoad: ({ context, location }) => {
    requireAuthenticatedSession(
      context.session,
      location.pathname,
      location.searchStr,
    );
  },
  component: SettingsRoute,
});

function SettingsRoute() {
  const { user, logout, logoutEverywhere } = useAuth();

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background-logged-in">
        <Navbar />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 pt-24 sm:p-8 sm:pt-24"
        >
          <Card className="mx-auto max-w-3xl p-6 sm:p-8">
            <h1 className="mb-6 text-3xl font-bold">Account settings</h1>

            <section aria-labelledby="account-heading">
              <h2 id="account-heading" className="text-xl font-bold">
                Account
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-lg font-semibold">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">User ID</p>
                  <p className="text-lg font-mono">{user?.id}</p>
                </div>
              </div>
            </section>

            <AdultContentPreference
              enabled={user?.allow_adult_content ?? false}
            />
            <DynamicCollectionsPreference />

            <div className="mt-8 flex flex-wrap gap-3 border-t border-gray-700 pt-6">
              <Button onClick={logout} variant="destructive">
                Logout
              </Button>
              <Button onClick={logoutEverywhere} variant="outline">
                Logout everywhere
              </Button>
            </div>
          </Card>
        </main>
        <Footer />
        <div className="pointer-events-none fixed right-0 bottom-0 left-0 z-10 h-16 bg-bottom-gradient" />
      </div>
    </ProtectedRoute>
  );
}
