import { Nav } from '@/components/nav';
import { Hero } from '@/components/hero';
import { DemoSection } from '@/components/demo-section';
import { FeatureStrip } from '@/components/feature-strip';
import { TwoPackages } from '@/components/two-packages';
import { Quickstart } from '@/components/quickstart';
import { Recipes } from '@/components/recipes';
import { Cta } from '@/components/cta';
import { Footer } from '@/components/footer';

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <DemoSection />
        <FeatureStrip />
        <TwoPackages />
        <Quickstart />
        <Recipes />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
