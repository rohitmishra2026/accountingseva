import { ServicesImpact } from "@/components/marketing/ServicesImpact";
import { Litigation } from "@/components/marketing/Litigation";
import { Industries } from "@/components/marketing/Industries";
import { WhyChoose } from "@/components/marketing/WhyChoose";
import { Office } from "@/components/marketing/Office";
import { WriteToUs } from "@/components/marketing/WriteToUs";
import { Faq } from "@/components/marketing/Faq";
import { About } from "@/components/marketing/About";
import { SaveContact } from "@/components/marketing/SaveContact";
import { Socials } from "@/components/marketing/Socials";

// Section order per the firm's requested flow, keeping the navy/white
// alternation: the white merged Services + Impact section opens, the dark
// Litigation section follows, and About + Save Our Contact form a deliberate
// dark closing block before the white socials strip and the footer.
export default function Home() {
  return (
    <main>
      <ServicesImpact />
      <Litigation />
      <Industries />
      <WhyChoose />
      <Office />
      <WriteToUs />
      <Faq />
      <About />
      <SaveContact />
      <Socials />
    </main>
  );
}
