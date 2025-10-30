import TopMenu from "@/app/_components/TopMenu";
import DomeGalleryBackground from "@/app/_components/Backgrounds/DomeGallery";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full">
      <TopMenu />
      <DomeGalleryBackground
        overlayOpacity={0.6}
        overlayColor="#12040fff"
        autoRotate={true}
        autoRotateSpeed={5}
        showNoise={true}
        noiseAlpha={18}
        noiseRefreshInterval={2}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-4 font-[family-name:var(--font-azeret-mono)]">Welcome to Denn</h1>
            <p className="text-xl">Explore our background gallery</p>
          </div>
        </div>
      </DomeGalleryBackground>
    </div>
  );
}
