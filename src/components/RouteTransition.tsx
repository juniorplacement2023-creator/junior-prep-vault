import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export const RouteTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<"fade-in" | "fade-out">("fade-in");

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage("fade-out");
    }
  }, [location, displayLocation]);

  const onAnimationEnd = () => {
    if (transitionStage === "fade-out") {
      setDisplayLocation(location);
      setTransitionStage("fade-in");
    }
  };

  return (
    <div
      className={`${transitionStage === "fade-in" ? "animate-fade-in" : "animate-fade-out"}`}
      onAnimationEnd={onAnimationEnd}
    >
      {children}
    </div>
  );
};
