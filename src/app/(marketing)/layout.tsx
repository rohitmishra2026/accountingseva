import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { ScrollToTopOnLoad } from "@/components/marketing/ScrollToTopOnLoad";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Runs during HTML parse, before anchor targets exist and before the
          router initialises: strips any #anchor from the URL and disables
          scroll restoration, so a refresh always opens at the top (the Our
          Practice section) instead of jumping back to e.g. #about. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            'try{if(location.hash)history.replaceState(null,"",location.pathname+location.search);if("scrollRestoration" in history)history.scrollRestoration="manual";}catch(e){}',
        }}
      />
      <ScrollToTopOnLoad />
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
