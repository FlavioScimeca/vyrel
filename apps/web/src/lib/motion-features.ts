export const loadMotionDomAnimation = () =>
  import("motion/react").then((mod) => mod.domAnimation);
