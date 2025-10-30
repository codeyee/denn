import TopMenu from "@/app/_components/TopMenu";
import DomeGalleryBackground from "@/app/_components/Backgrounds/DomeGallery";
import BlurText from "@/app/_components/ui/TextAnimations/BlurText";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full">
      <TopMenu />
      <DomeGalleryBackground
        overlayOpacity={0.6}
        overlayColor="#12040fff"
        autoRotate={true}
        autoRotateSpeed={2}
        showNoise={true}
        noiseAlpha={18}
        noiseRefreshInterval={2}
      >
        <div className="flex items-center justify-center h-full px-4">
          <div className="text-center text-white w-full max-w-5xl">
            <BlurText
              text="Welcome to Denn"
              delay={100}
              initialDelay={500}
              animateBy="words"
              direction="bottom"
              className="text-4xl md:text-7xl font-bold mb-4 font-[family-name:var(--font-azeret-mono)] justify-center"
            />
            <p className="text-lg md:text-xl">Explore our background gallery</p>
          </div>
        </div>
      </DomeGalleryBackground>
    </div>
  );
}
