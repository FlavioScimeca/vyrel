import { FeatureCustomizableCard } from "./feature-customizable-card";
import { FeatureFasterCard } from "./feature-faster-card";
import { FeatureLovedOnesCard } from "./feature-loved-ones-card";
import { FeatureSecureCard } from "./feature-secure-card";
import { FeatureShieldCard } from "./feature-shield-card";

export function FeaturesSection() {
  return (
    <section className="bg-gray-50 py-16 md:py-32 dark:bg-transparent">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative">
          <div className="relative z-10 grid grid-cols-6 gap-3">
            <FeatureCustomizableCard />
            <FeatureSecureCard />
            <FeatureFasterCard />
            <FeatureShieldCard />
            <FeatureLovedOnesCard />
          </div>
        </div>
      </div>
    </section>
  );
}
