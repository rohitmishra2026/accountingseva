import { cn } from "@/lib/cn";
import { Reveal } from "@/components/Reveal";

// Standard section wrapper: anchor id for smooth-scroll nav, generous padding,
// optional eyebrow + heading + intro. `tone` flips the text palette so dark
// (navy-900) sections stay readable; callers pass the background via className.
export function Section({
  id,
  eyebrow,
  heading,
  intro,
  children,
  className,
  contentClassName,
  tone = "light",
  align = "left",
}: {
  id: string;
  eyebrow?: string;
  heading?: string;
  intro?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  tone?: "light" | "dark";
  align?: "left" | "center";
}) {
  const dark = tone === "dark";
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 px-6 py-20 sm:py-24", className)}
    >
      <div className="mx-auto max-w-6xl">
        {(eyebrow || heading || intro) && (
          <Reveal
            className={cn(
              "mb-12 max-w-2xl",
              align === "center" && "mx-auto text-center"
            )}
          >
            {eyebrow && (
              <p
                className={cn(
                  "mb-3 text-sm font-semibold uppercase tracking-widest",
                  dark ? "text-navy-300" : "text-navy-500"
                )}
              >
                {eyebrow}
              </p>
            )}
            {heading && (
              <h2
                className={cn(
                  "text-3xl font-semibold tracking-tight sm:text-4xl",
                  dark ? "text-white" : "text-navy-900"
                )}
              >
                {heading}
              </h2>
            )}
            {intro && (
              <p
                className={cn(
                  "mt-4 text-lg",
                  dark ? "text-navy-200" : "text-navy-600"
                )}
              >
                {intro}
              </p>
            )}
          </Reveal>
        )}
        <div className={contentClassName}>{children}</div>
      </div>
    </section>
  );
}
