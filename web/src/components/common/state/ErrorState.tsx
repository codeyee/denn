import { getErrorMessage } from "@/lib/utils/typeGuards";

interface ErrorStateProps {
  error?: unknown;
  errors?: Array<{ label: string; error: unknown }>;
  title?: string;
  fullScreen?: boolean;
}

export function ErrorState({
  error,
  errors,
  title = "Error loading data",
  fullScreen = false,
}: ErrorStateProps) {
  const filteredErrors = errors?.filter(({ error: err }) => err) ?? [];
  const defaultError = error ? [{ label: "Error", error }] : [];
  const errorList = filteredErrors.length > 0 ? filteredErrors : defaultError;

  if (errorList.length === 0) {
    return null;
  }

  const containerClassName = fullScreen
    ? "relative w-full min-h-screen bg-background-logged-in"
    : "";

  const contentClassName = fullScreen
    ? "container mx-auto px-4 mt-8 py-20"
    : "py-8";

  return (
    <div className={containerClassName}>
      <div className={contentClassName}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-400 text-xl mb-4">{title}</p>
            {errorList.map(({ label, error: err }, index) => (
              <p key={index} className="text-gray-400 mb-2">
                {label}: {getErrorMessage(err)}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
