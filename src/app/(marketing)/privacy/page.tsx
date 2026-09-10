import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How we collect, use, store and protect your personal and financial data, in line with India's Digital Personal Data Protection Act 2023.",
};

// Standalone legal page. Renders inside the (marketing) layout, so it inherits
// the site Header and Footer. Content is a centred reading column (max-w-3xl)
// for comfortable line length; palette and type scale match the rest of the
// marketing site (navy tokens, Inter, tracking-tight headings).

// Shared type tokens so every section reads consistently.
const H2 = "text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl";
const P = "mt-4 text-base leading-relaxed text-navy-600";
const LINK =
  "font-medium text-navy-700 underline underline-offset-2 transition-colors hover:text-navy-900";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className={H2}>{children}</h2>;
}

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-white">
      {/* ── Title band ─────────────────────────────────────────────────── */}
      <div className="border-b border-navy-100 bg-navy-50/50">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-navy-500">
            Legal
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-navy-900 sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-navy-600">
            This policy explains what personal and financial information we hold
            about you, why we hold it, and the rights you have over it. We have
            written it in plain language so you do not need a lawyer to read it.
          </p>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <div className="space-y-12">
          <section>
            <SectionHeading>What data we collect</SectionHeading>
            <p className={P}>
              We collect the information we need to run your account and serve you
              as a client. This includes your name, email address, phone number
              and client code, along with your portfolio information: your
              holdings, your transactions, and the portfolio reports we prepare
              for you. When you use the portal we also record basic technical
              information such as your IP address and browser type, and we set an
              essential session cookie that keeps you logged in.
            </p>
            <p className={P}>
              Most of your portfolio data is not entered through a form. It comes
              from the records we maintain for your account and is synced into the
              portal on a scheduled basis. You give us your account details
              directly when you engage us.
            </p>
          </section>

          <section>
            <SectionHeading>Why we collect it</SectionHeading>
            <p className={P}>
              We use your data only to provide and manage your account: to show
              your holdings and transactions in the portal, to prepare your
              periodic portfolio reports, and to keep security and audit logs so
              we can detect and investigate any unauthorised access. We do not
              use it for anything else, and we do not repurpose it for anything
              you would not expect.
            </p>
          </section>

          <section>
            <SectionHeading>How we store and protect it</SectionHeading>
            <p className={P}>
              Your data is held in a secure cloud database rather than in loose
              files. Access is controlled at the database itself, so each client
              can only ever read their own records and never another
              client&rsquo;s. All traffic between your browser and the portal is
              encrypted over HTTPS, and access to the underlying records is
              limited to authorised personnel for the purpose of servicing your
              account.
            </p>
          </section>

          <section>
            <SectionHeading>Cookies</SectionHeading>
            <p className={P}>
              We use a single essential cookie: a session cookie that keeps you
              logged in as you move around the portal. We do not use any tracking,
              analytics or advertising cookies, so no cookie consent banner is
              needed.
            </p>
          </section>

          <section>
            <SectionHeading>Data sharing</SectionHeading>
            <p className={P}>
              We do not sell, rent or trade your data, and we do not share it with
              third parties for their own purposes. It is accessed only by
              authorised personnel to service your account. The only exception is
              where we are legally required to disclose information, for example in
              response to a valid order from a court, tax authority or regulator,
              and in that case we disclose only what the law requires.
            </p>
          </section>

          <section>
            <SectionHeading>How long we keep it</SectionHeading>
            <p className={P}>
              We keep your account data for as long as you are engaged with us and
              for eight years afterwards, in line with the record-keeping
              obligations that apply to us. Security and audit logs are kept for
              180 days. Once a retention period ends, we delete or anonymise the
              data so it can no longer be linked back to you.
            </p>
          </section>

          <section>
            <SectionHeading>Your rights</SectionHeading>
            <p className={P}>
              Under the Digital Personal Data Protection Act, 2023, you can ask us
              for a copy of the data we hold about you, ask us to correct it if it
              is wrong, and ask us to delete it, subject to the retention periods
              above that we are legally required to keep. You can also raise a
              complaint about how your data is handled, and nominate someone to
              exercise these rights on your behalf. To do any of this, contact us
              using the details below.
            </p>
          </section>

          <section>
            <SectionHeading>Changes to this policy</SectionHeading>
            <p className={P}>
              We may update this policy from time to time, for example if the law
              changes or we change how the portal works. If a change is
              significant, we will let active clients know directly, usually by
              email. We encourage you to review this page occasionally.
            </p>
          </section>

          <section>
            <SectionHeading>Contact us</SectionHeading>
            <p className={P}>
              For anything relating to this policy or your data, you can reach us
              at{" "}
              <a href={`mailto:${site.contact.email}`} className={LINK}>
                {site.contact.email}
              </a>
              , or at either of our offices:
            </p>
            <ul className="mt-4 space-y-4">
              {site.contact.offices.map((office) => (
                <li key={office.name}>
                  <p className="font-semibold text-navy-800">{office.name}</p>
                  <p className="mt-0.5 text-base text-navy-600">
                    {office.address}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
