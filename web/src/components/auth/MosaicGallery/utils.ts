export type MosaicImage = {
  src: string;
  alt?: string;
};

export function buildMosaicRows(
  images: MosaicImage[],
  rowCount: number,
  itemsPerRow: number,
): MosaicImage[][] {
  if (images.length === 0 || rowCount <= 0 || itemsPerRow <= 0) {
    return [];
  }

  const rows = Math.floor(rowCount);
  const rowLength = Math.floor(itemsPerRow);
  const rowOffset = Math.max(1, Math.floor(images.length / rows));

  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from(
      { length: rowLength },
      (_, itemIndex) =>
        images[(rowIndex * rowOffset + itemIndex) % images.length],
    ),
  );
}
