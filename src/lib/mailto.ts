// Builds the "Write to Us" mailto: link with a pre-filled subject and body
// template for a written enquiry. Kept here so the copy is easy to tweak in
// one place.
import { site } from "@/content/site";

export function writeToUsMailto(): string {
  const subject = "Enquiry - AccountingSeva";
  const body = [
    "Hello AccountingSeva team,",
    "",
    "I would like to enquire about your services. My details:",
    "",
    "Name: ",
    "Nature of query (GST / ITR / advisory / litigation): ",
    "Brief description of my requirement: ",
    "Preferred contact detail (email or phone): ",
    "",
    "Thank you.",
  ].join("\n");

  // NOTE: do NOT use URLSearchParams here — it encodes spaces as "+", and mail
  // clients render "+" literally in mailto links. Percent-encoding (spaces ->
  // %20, newlines -> %0A) is what mail clients expect.
  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${site.contact.email}?${query}`;
}

// Litigation mailto: pre-drafted for someone holding a notice, used by the
// "Discuss a notice" button in the litigation section.
export function noticeMailto(): string {
  const subject = "GST / Income Tax Notice - AccountingSeva";
  const body = [
    "Hello AccountingSeva team,",
    "",
    "I have received a notice and would like to discuss it. My details:",
    "",
    "Name: ",
    "Type of notice (GST / income tax / other): ",
    "Date on the notice and reply deadline, if any: ",
    "Brief description: ",
    "Preferred contact detail (email or phone): ",
    "",
    "Thank you.",
  ].join("\n");

  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${site.contact.email}?${query}`;
}

// Portal password mailto: the only route to a new password, since the portal
// has no self-service reset. Deliberately does NOT ask for a password in the
// body: the team sets it and passes it on directly, never over email.
export function passwordHelpMailto(): string {
  const subject = "Client Portal - password help";
  const body = [
    "Hello AccountingSeva team,",
    "",
    "I need help signing in to the client portal. My details:",
    "",
    "Name: ",
    "Email address I use for the portal: ",
    "Preferred phone number to reach me on: ",
    "",
    "Thank you.",
  ].join("\n");

  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${site.contact.email}?${query}`;
}

/**
 * WhatsApp click-to-chat for a client locked out of the portal who needs a
 * faster answer than email.
 *
 * Not a mailto, but it lives here with the other pre-filled contact links so
 * the wording stays in one place. Built from site.socials.whatsapp, which is
 * the Goa direct line, so the number never gets hardcoded twice.
 *
 * Kept deliberately short: WhatsApp shows the prefilled text in the compose
 * box, and a long body reads as spam and usually gets deleted before sending.
 * As with the email, it never asks for a password.
 */
export function passwordHelpWhatsapp(): string {
  const text =
    "Hello AccountingSeva team, I cannot sign in to the client portal and need " +
    "help urgently. My name is: \nMy portal email address is: ";
  return `${site.socials.whatsapp}?text=${encodeURIComponent(text)}`;
}

// Careers mailto: a semi-drafted application email. The applicant fills in
// the blanks and attaches their CV before sending.
export function careersMailto(): string {
  const subject = "Job Application - AccountingSeva";
  const body = [
    "Hello AccountingSeva team,",
    "",
    "I would like to apply to work with your firm. My details:",
    "",
    "Name: ",
    "Role I am applying for: ",
    "Current city: ",
    "Total experience (years): ",
    "Qualification (CA / CA Inter / B.Com / other): ",
    "Notice period or availability: ",
    "",
    "I have attached my CV with this email.",
    "",
    "Thank you.",
  ].join("\n");

  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${site.contact.email}?${query}`;
}
