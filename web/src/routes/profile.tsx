import { createFileRoute } from "@tanstack/react-router";

import { ProtectedRoute } from "@/components/common/providers/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/common/ui/Button";
import { Card } from "@/components/common/ui/Card";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { requireAuthenticatedSession } from "@/lib/auth/protected-route";
import { AdultContentPreference } from "@/components/pages/ProfilePage/AdultContentPreference";
import { PublicProfileSettings } from "@/components/pages/ProfilePage/PublicProfileSettings";

export const Route = createFileRoute("/profile")({
  beforeLoad: ({ context, location }) => {
    requireAuthenticatedSession(
      context.session,
      location.pathname,
      location.searchStr,
    );
  },
  component: ProfileRoute,
});

function ProfileRoute() {
  const { user, logout, logoutEverywhere } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-background-logged-in">
        <Navbar />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 pt-24 sm:p-8 sm:pt-24">
          <Card className="max-w-3xl mx-auto p-6 sm:p-8">
            <h1 className="text-3xl font-bold mb-6">Profile</h1>

            {user ? (
              <PublicProfileSettings
                username={user.username}
                bio={user.bio ?? ""}
                avatarUrl={user.avatar_url ?? ""}
              />
            ) : null}

            <section className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
              <h2 className="text-xl font-bold">Account</h2>
              <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="text-lg font-semibold">{user?.email}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">User ID</p>
                <p className="text-lg font-mono">{user?.id}</p>
              </div>
              </div>
            </section>

            <AdultContentPreference
              enabled={user?.allow_adult_content ?? false}
            />

            <div className="mt-8 flex flex-wrap gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
              <Button
                onClick={logout}
                variant="destructive"
                className="cursor-pointer"
              >
                Logout
              </Button>
              <Button
                onClick={logoutEverywhere}
                variant="outline"
                className="cursor-pointer"
              >
                Logout everywhere
              </Button>
            </div>
          </Card>
        </main>
        <Footer />

        <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
      </div>
    </ProtectedRoute>
  );
}
