"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Section } from "./Section";
import { Reveal } from "@/components/Reveal";
import { faqs } from "@/content/marketing";
import { cn } from "@/lib/cn";

export function Faq() {
  // Independent panels: any number of questions can stay open at once.
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <Section
      id="faq"
      eyebrow="Questions"
      heading="Frequently Asked Questions"
      className="bg-white"
      align="center"
    >
      <Reveal className="mx-auto max-w-3xl divide-y divide-navy-100 rounded-2xl border border-navy-100 bg-white">
        {faqs.map((item, i) => {
          const isOpen = open.has(i);
          const panelId = `faq-panel-${i}`;
          const btnId = `faq-button-${i}`;
          return (
            <div key={i}>
              <h3>
                <button
                  id={btnId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-navy-50/50"
                >
                  <span className="font-medium text-navy-900">{item.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 flex-shrink-0 text-navy-500 transition-transform duration-300",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
              </h3>
              {/* Smooth height animation via the grid-rows trick. */}
              <div
                id={panelId}
                role="region"
                aria-labelledby={btnId}
                aria-hidden={!isOpen}
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-5 text-navy-600">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </Reveal>
    </Section>
  );
}
