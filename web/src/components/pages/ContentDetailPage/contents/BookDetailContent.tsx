
import { BookDetail } from "@/lib/types";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";

interface BookDetailContentProps {
  book: BookDetail;
}

export function BookDetailContent({ book }: BookDetailContentProps) {
  const releaseDate = formatReleaseDate(book.release_date);
  return (
    <>
      <div className="mt-8 w-full px-4 md:px-8 lg:px-12">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-6">About</h2>
          {book.description && (
            <p className="text-gray-300 mb-4 leading-relaxed font-sans">&quot;{book.description}...&quot;</p>
          )}

          <div className="mt-6 space-y-2">
              {book.authors && book.authors.length > 0 && (
                <div>
                  <span className="text-white/60 font-bold">Authors:</span>
                  <span className="text-white ml-2 font-sans">{formatAuthors(book.authors)}</span>
                </div>
              )}
              {releaseDate && (
                <div>
                  <span className="text-white/60 font-bold">Release Date:</span>
                  <span className="text-white ml-2 font-sans">{releaseDate}</span>
                </div>
              )}
              {book.pages !== undefined && (
                <div>
                  <span className="text-white/60 font-bold">Pages:</span>
                  <span className="text-white ml-2 font-sans">{book.pages}</span>
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
}
