import type { DomeImage } from ".";

type DomeItem = DomeImage & {
  sizeX: number;
  sizeY: number;
  x: number;
  y: number;
};

export function buildDomeItems(images: DomeImage[], segments: number): DomeItem[] {
  if (images.length === 0) {
    return [];
  }

  const columns = Array.from({ length: segments }, (_, index) => -37 + index * 2);
  const evenRows = [-4, -2, 0, 2, 4];
  const oddRows = [-3, -1, 1, 3, 5];
  const coordinates = columns.flatMap((x, columnIndex) =>
    (columnIndex % 2 === 0 ? evenRows : oddRows).map((y) => ({
      x,
      y,
      sizeX: 2,
      sizeY: 2,
    })),
  );

  return coordinates.map((coordinate, index) => ({
    ...coordinate,
    ...images[index % images.length],
  }));
}
