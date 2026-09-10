import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/portal/AuthShell";
import { passwordHelpMailto, passwordHelpWhatsapp } from "@/lib/mailto";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Password Help",
  robots: { index: false, follow: false },
};

// This page replaced a self-service reset form. The portal deliberately has no
// automatic password reset: passwords are set by the team and handed to the
// client directly. See the explanation rendered below, which is written for the
// client rather than for us.
//
// There is no longer any /portal/update-password route, and no server action
// that sends a reset email. This page is the whole flow.
export default function PasswordHelpPage() {
  return (
    <AuthShell
      title="Password help"
      subtitle="Write to us and we will get you back in."
      footer={
        <Link href="/portal/login" className="font-medium hover:text-navy-900">
          Back to sign in
        </Link>
      }
    >
      <div className="space-y-5">
        <div className="flex gap-3 rounded-xl border border-navy-100 bg-navy-50 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-navy-700" />
          <div className="text-sm leading-relaxed text-navy-700">
            <p className="font-semibold text-navy-900">
              We do not send password reset links.
            </p>
            <p className="mt-1.5">
              Reset links sent by email are one of the most common ways accounts
              are taken over. Anyone who reaches your inbox, even briefly, can
              use one. Your portfolio is held here, so we have chosen not to
              have that route exist at all.
            </p>
            <p className="mt-1.5">
              Instead we confirm who you are and set a new password with you
              directly.
            </p>
          </div>
        </div>

        <div className="text-sm leading-relaxed text-navy-700">
          <p className="font-semibold text-navy-900">What to do</p>
          <p className="mt-1.5">
            Email us at{" "}
            <span className="font-medium text-navy-900">
              {site.contact.email}
            </span>{" "}
            with your name and the email address you use for the portal. We will
            reply and arrange a new password with you.
          </p>
          <p className="mt-1.5 text-navy-600">
            Please do not send a password by email, either your old one or one
            you would like. We will never ask you for it in writing.
          </p>
        </div>

        <div className="space-y-3">
          <a
            href={passwordHelpMailto()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-navy-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy-700 hover:shadow-md active:scale-[0.98]"
          >
            <Mail className="h-4 w-4" />
            Email the team
          </a>

          {/* Secondary by design: email is the record we want, WhatsApp is the
              escape hatch when someone needs an answer today. Opens in a new
              tab because wa.me hands off to the app or to web.whatsapp.com. */}
          <a
            href={passwordHelpWhatsapp()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-navy-200 bg-white px-5 py-3 text-sm font-semibold text-navy-800 transition-all hover:border-navy-700 hover:bg-navy-50 active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" />
            Message us on WhatsApp
          </a>
        </div>

        <p className="text-center text-xs text-navy-500">
          Need it urgently? WhatsApp is fastest during office hours:
          <br />
          {site.contact.officeHours}
        </p>
      </div>
    </AuthShell>
  );
}
