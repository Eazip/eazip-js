import { Nav } from '@/components/nav';
import { Hero } from '@/components/hero';
import { DemoSection } from '@/components/demo-section';
import { FeatureStrip } from '@/components/feature-strip';
import { TwoPackages } from '@/components/two-packages';
import { Quickstart } from '@/components/quickstart';
import { Recipes } from '@/components/recipes';
import { Cta } from '@/components/cta';
import { Footer } from '@/components/footer';
import { CloudIntro } from '@/components/cloud-intro';
import { IntegrationPreferenceProvider } from '@/components/integration-preference';

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <IntegrationPreferenceProvider>
          <Hero />
          <DemoSection />
          <FeatureStrip />
          <TwoPackages />
          <Quickstart />
        </IntegrationPreferenceProvider>
        <CloudIntro />
        <Recipes />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
