/* eslint-disable @next/next/no-img-element */
// Firm logo. Save the artwork to `public/images/logo.png` (see PLACEHOLDERS.md).
// Plain <img> (not next/image) so a missing file degrades to the alt text
// "AccountingSeva" instead of breaking the build. Height is set by className;
// width scales to the logo's natural aspect ratio.
export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return <img src="/images/logo.png" alt="AccountingSeva" className={className} />;
}
