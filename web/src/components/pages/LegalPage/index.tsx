import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

interface LegalSection {
  heading: string;
  content: ReactNode;
}

interface LegalPageProps {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export function LegalPage({ title, intro, sections }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background-logged-in">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="px-4 pb-16 pt-28 md:pt-36">
        <article className="mx-auto max-w-3xl text-pretty">
          <h1 className="text-3xl font-bold text-balance md:text-4xl">{title}</h1>
          <p className="mt-4 max-w-[70ch] text-base leading-7 text-gray-200">
            {intro}
          </p>
          <p className="mt-2 text-sm text-gray-300">Last updated July 24, 2026.</p>

          <div className="mt-10 space-y-10">
            {sections.map((section) => (
              <section key={section.heading} aria-labelledby={toId(section.heading)}>
                <h2 id={toId(section.heading)} className="text-xl font-semibold">
                  {section.heading}
                </h2>
                <div className="mt-3 max-w-[70ch] space-y-3 leading-7 text-gray-200">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function toId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
