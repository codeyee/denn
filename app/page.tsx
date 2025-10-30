import TopMenu from "@/app/_components/TopMenu";
import DomeGalleryBackground from "@/app/_components/Backgrounds/DomeGallery";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full">
      <TopMenu />
      <DomeGalleryBackground
        overlayOpacity={0.6}
        overlayColor="#000000"
        autoRotate={true}
        autoRotateSpeed={5}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-4">Welcome to Denn</h1>
            <p className="text-xl">Explore our background gallery</p>
          </div>
        </div>
      </DomeGalleryBackground>
    </div>
  );
}
