import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { ListItemSkeleton } from "@/components/common/lists/ListItemSkeleton";
import { VerticalList } from "@/components/common/lists/VerticalList";
import {
  ItemsHeaderPlaceholder,
  ListHeaderPlaceholder,
  ListSidebarPlaceholder,
} from "./components";

export function ListLoadingState() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="relative min-h-screen w-full bg-background-logged-in">
        <h1 className="sr-only">Loading list</h1>
        <div className="container mx-auto mt-8 px-4 pb-8 pt-30">
          <ListHeaderPlaceholder />
          <div className="flex flex-col gap-6 md:flex-row lg:gap-8">
            <div className="order-2 min-w-0 flex-1 pb-8 md:order-1">
              <ItemsHeaderPlaceholder />
              <VerticalList spacing="md">
                {Array.from({ length: 10 }, (_, index) => (
                  <ListItemSkeleton key={`skeleton-${index}`} index={index} />
                ))}
              </VerticalList>
            </div>
            <ListSidebarPlaceholder />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export function ListErrorState({ message }: { message: string }) {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-background-logged-in px-4">
        <div className="text-center">
          <h1 className="text-xl text-red-300">{message}</h1>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mt-4 min-h-11 px-3 text-white/85 underline hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Go back
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
