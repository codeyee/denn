export const DOME_GALLERY_STYLES = `
  .sphere-root {
    --radius: 520px;
    --viewer-pad: 72px;
    --circ: calc(var(--radius) * 3.14);
    --rot-y: calc((360deg / var(--segments-x)) / 2);
    --rot-x: calc((360deg / var(--segments-y)) / 2);
    --item-width: calc(var(--circ) / var(--segments-x));
    --item-height: calc(var(--circ) / var(--segments-y));
  }

  .sphere-root * { box-sizing: border-box; }
  .sphere, .sphere-item, .item__image { transform-style: preserve-3d; }

  .stage {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    position: absolute;
    inset: 0;
    margin: auto;
    perspective: calc(var(--radius) * 2);
    perspective-origin: 50% 50%;
  }

  .sphere {
    transform: translateZ(calc(var(--radius) * -1));
    will-change: transform;
    position: absolute;
  }

  .sphere-item {
    width: calc(var(--item-width) * var(--item-size-x));
    height: calc(var(--item-height) * var(--item-size-y));
    position: absolute;
    top: -999px;
    bottom: -999px;
    left: -999px;
    right: -999px;
    margin: auto;
    transform-origin: 50% 50%;
    backface-visibility: hidden;
    transition: transform 300ms;
    transform: rotateY(calc(var(--rot-y) * (var(--offset-x) + ((var(--item-size-x) - 1) / 2)) + var(--rot-y-delta, 0deg)))
              rotateX(calc(var(--rot-x) * (var(--offset-y) - ((var(--item-size-y) - 1) / 2)) + var(--rot-x-delta, 0deg)))
              translateZ(var(--radius));
  }

  .sphere-root[data-enlarging="true"] .scrim {
    opacity: 1 !important;
    pointer-events: all !important;
  }

  @media (max-aspect-ratio: 1/1) {
    .viewer-frame {
      height: auto !important;
      width: 100% !important;
    }
  }

  .sphere-root {
    --item-inset: 12px;
  }

  @media (max-width: 768px) {
    .sphere-root {
      --tile-radius: 12px;
      --item-inset: 6px;
    }
  }

  .item__image {
    position: absolute;
    inset: var(--item-inset, 10px);
    border-radius: var(--tile-radius, 12px);
    overflow: hidden;
    cursor: pointer;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transition: transform 300ms;
    pointer-events: auto;
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
  }

  .item__image--reference {
    position: absolute;
    inset: var(--item-inset, 10px);
    pointer-events: none;
  }
`;
