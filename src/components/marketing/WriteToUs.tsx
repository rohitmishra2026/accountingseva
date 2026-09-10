import { Mail, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { writeToUsMailto } from "@/lib/mailto";

// Dark band: the floating card matches the Save Our Contact band's language
// (white/5 card on navy) so the two dark CTAs read as one family.
export function WriteToUs() {
  return (
    <section id="write" className="scroll-mt-24 bg-navy-900 px-6 py-20 sm:py-24">
      <Reveal className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/5 px-8 py-14 text-center text-white sm:px-16">
        <Mail className="mx-auto h-8 w-8 text-navy-200" />
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Write to Us
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-navy-100">
          Tell us your name, the nature of your query (GST, ITR, advisory or
          litigation) and how to reach you. We will reply with the next steps.
        </p>
        <a
          href={writeToUsMailto()}
          className="group mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy-900 transition-all hover:bg-navy-50 active:scale-[0.98]"
        >
          Write to Us
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </a>
      </Reveal>
    </section>
  );
}
