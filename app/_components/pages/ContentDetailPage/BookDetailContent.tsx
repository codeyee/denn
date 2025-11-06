"use client";

import { BookDetail } from "@/lib/api/types";
import { formatReleaseDate } from "@/lib/utils/dateUtils";

interface BookDetailContentProps {
  book: BookDetail;
}

export default function BookDetailContent({ book }: BookDetailContentProps) {
  const releaseDate = formatReleaseDate(book.release_date);
  return (
    <>
      <div className="container mx-auto px-4">
        <div className="mb-10 text-lg">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">About</h2>
            {book.description && (
              <p className="text-gray-300 mb-4 leading-relaxed font-sans">"{book.description}..."</p>
            )}

            <div className="my-6 space-y-2">
              {book.authors && book.authors.length > 0 && (
                <div>
                  <span className="text-white/60 font-bold">Authors:</span>
                  <span className="text-white ml-2 font-sans">{book.authors.join(", ")}</span>
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
      </div>
    </>
  );
}

