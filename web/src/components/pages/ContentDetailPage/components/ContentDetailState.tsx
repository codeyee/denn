interface ContentDetailStateProps {
  title: string;
  message: string;
  tone: "error" | "warning";
  actionLabel: string;
  onAction: () => void;
}

export function ContentDetailState({
  title,
  message,
  tone,
  actionLabel,
  onAction,
}: ContentDetailStateProps) {
  const titleColor = tone === "error" ? "text-red-400" : "text-yellow-400";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative w-full min-h-screen bg-background-logged-in"
    >
      <div className="mx-auto mt-8 w-full max-w-[1800px] px-4 py-20 md:px-8 lg:px-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h1 className={`${titleColor} text-xl mb-4`}>{title}</h1>
            <p className="text-gray-400 mb-4">{message}</p>
            <button
              type="button"
              onClick={onAction}
              className="min-h-11 px-3 text-white/80 hover:text-white underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
