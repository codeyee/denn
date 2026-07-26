interface CarouselWrapAnimationOptions {
  container: HTMLElement;
  target: number;
  direction: -1 | 1;
  onPositionChange?: () => void;
}

interface ActiveWrapAnimation {
  animations: Animation[];
}

const activeWrapAnimations = new WeakMap<HTMLElement, ActiveWrapAnimation>();
const WRAP_EXIT_DURATION = 100;
const WRAP_ENTER_DURATION = 160;
const WRAP_OFFSET = 24;

export async function animateCarouselWrap({
  container,
  target,
  direction,
  onPositionChange,
}: CarouselWrapAnimationOptions) {
  cancelCarouselWrapAnimation(container);
  if (typeof container.animate !== "function") {
    container.scrollTo({ left: target, behavior: "auto" });
    onPositionChange?.();
    return;
  }

  const transition: ActiveWrapAnimation = { animations: [] };
  activeWrapAnimations.set(container, transition);
  const outgoingOffset = direction === -1 ? WRAP_OFFSET : -WRAP_OFFSET;
  const incomingOffset = -outgoingOffset;
  container.dataset.carouselWrapPhase = "outgoing";

  try {
    const outgoing = container.animate(
      [
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
        {
          opacity: 0.18,
          transform: `translate3d(${outgoingOffset}px, 0, 0)`,
        },
      ],
      {
        duration: WRAP_EXIT_DURATION,
        easing: "cubic-bezier(0.4, 0, 1, 1)",
        fill: "forwards",
      },
    );
    transition.animations.push(outgoing);
    await ignoreAnimationCancellation(outgoing);
    if (activeWrapAnimations.get(container) !== transition) return;

    container.scrollTo({ left: target, behavior: "auto" });
    onPositionChange?.();
    container.dataset.carouselWrapPhase = "incoming";
    const incoming = container.animate(
      [
        {
          opacity: 0.18,
          transform: `translate3d(${incomingOffset}px, 0, 0)`,
        },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      {
        duration: WRAP_ENTER_DURATION,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "both",
      },
    );
    transition.animations = [incoming];
    outgoing.cancel();
    await ignoreAnimationCancellation(incoming);
  } finally {
    if (activeWrapAnimations.get(container) === transition) {
      transition.animations.forEach((animation) => animation.cancel());
      activeWrapAnimations.delete(container);
      delete container.dataset.carouselWrapPhase;
      onPositionChange?.();
    }
  }
}

export function cancelCarouselWrapAnimation(container: HTMLElement) {
  const active = activeWrapAnimations.get(container);
  if (!active) return;
  active.animations.forEach((animation) => animation.cancel());
  activeWrapAnimations.delete(container);
  delete container.dataset.carouselWrapPhase;
}

async function ignoreAnimationCancellation(animation: Animation) {
  await animation.finished.catch(() => undefined);
}
