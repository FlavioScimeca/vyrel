"use client";

import { HeroHeader } from "@/components/templates/hero-section-2/header";
import { FeaturesSection } from "@/components/templates/hero-section-2/hero-features-section";
import { HeroFooter } from "@/components/templates/hero-section-2/hero-footer";
import { HeroSection } from "@/components/templates/hero-section-2/hero-section";
import { HeroIntegrationsSection } from "@/components/templates/hero-section-2/integrations-section";

export default function Home() {
  return (
    <div>
      {/* <Vortex arms={5} className="h-[50dvh] w-full" count={6000} speed={1.4} /> */}
      <HeroHeader />
      <HeroSection />
      <HeroIntegrationsSection />
      <FeaturesSection />
      <HeroFooter />
    </div>
  );
}
