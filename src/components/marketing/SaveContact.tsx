import { Download } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { site } from "@/content/site";

export function SaveContact() {
  return (
    <section id="save-contact" className="scroll-mt-24 bg-navy-900 px-6 py-16 sm:py-20">
      <Reveal className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-6 rounded-2xl border border-white/10 bg-white/5 px-8 py-8 text-center sm:flex-row sm:text-left">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Save Our Contact
          </h2>
          <p className="mt-1 text-sm text-navy-200">
            Add {site.firmName} to your phone contacts in one tap.
          </p>
        </div>
        <a
          href={site.vcard.file}
          download={site.vcard.downloadName}
          className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-navy-900 transition-all hover:bg-navy-50 active:scale-[0.98]"
        >
          <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
          Save Contact
        </a>
      </Reveal>
    </section>
  );
}
