"use client";

import { LandingNavbar } from "./landing-navbar";
import { HeroExperience } from "./hero-experience";
import { ConnectedBusinessEngine } from "./connected-business-engine";
import { CinematicFilmSection } from "./cinematic-film-section";
import { ScrollChapters } from "./scroll-chapters";
import { ProductExplorer } from "./product-explorer";
import { WorkflowStory } from "./workflow-story";
import { FinalConversion } from "./final-conversion";
import { LandingFooter } from "./landing-footer";

export function LandingPageClient() {
  const handleWatchFilm = () => {
    const el = document.querySelector("#film");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-[#ff6b3d] selection:text-white antialiased font-sans">
      {/* Top Fixed Architecture Navigation */}
      <LandingNavbar />

      <main className="relative flex flex-col">
        {/* Section 1: Opening Experience — Unforgettable First Screen with 3D Central Visual */}
        <HeroExperience onWatchFilm={handleWatchFilm} />

        {/* Section 2: Signature Interaction — The Connected Business Engine */}
        <ConnectedBusinessEngine />

        {/* Section 3: Cinematic Brand Film — 60-Second Real Experience */}
        <CinematicFilmSection />

        {/* Section 4: Scroll Experience — Six Connected Visual Chapters */}
        <ScrollChapters />

        {/* Section 5: The Product Explorer — Real Application Categories & Modules */}
        <ProductExplorer />

        {/* Section 6: The Workflow Story — 10-Step Traceable Lifecycle */}
        <WorkflowStory />

        {/* Section 7 & 8: Final Conversion — The Unmistakable Close */}
        <FinalConversion />
      </main>

      {/* Architectural Footer */}
      <LandingFooter />
    </div>
  );
}
