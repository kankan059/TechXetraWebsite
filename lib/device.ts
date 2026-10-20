export const isTouchDevice = () => {
  if (typeof window === "undefined") return false;

  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const hasTouch = navigator.maxTouchPoints > 0;
  const smallScreen = Math.min(
    window.screen.width,
    window.screen.height
  ) <= 768;

  return (hasTouch && coarsePointer) || (hasTouch && smallScreen);
};