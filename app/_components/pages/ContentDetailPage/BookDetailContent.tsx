"use client";

import { BookDetail } from "@/lib/api/types";

interface BookDetailContentProps {
  book: BookDetail;
}

export default function BookDetailContent({ book }: BookDetailContentProps) {
  return (
    <>
      <div className="bg-white/5 rounded-2xl p-6 md:p-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">About</h2>
            {book.description && (
              <p className="text-gray-300 mb-4 leading-relaxed">{book.description}</p>
            )}
            
            <div className="mt-6 space-y-2">
              {book.authors && book.authors.length > 0 && (
                <div>
                  <span className="text-white/60 text-sm">Authors:</span>
                  <span className="text-white ml-2">{book.authors.join(", ")}</span>
                </div>
              )}
              {book.release_date && (
                <div>
                  <span className="text-white/60 text-sm">Release Date:</span>
                  <span className="text-white ml-2">{book.release_date}</span>
                </div>
              )}
              {book.pages !== undefined && (
                <div>
                  <span className="text-white/60 text-sm">Pages:</span>
                  <span className="text-white ml-2">{book.pages}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

