"use client";

import { MoonStarIcon, SunIcon } from "lucide-react";
import { Switch } from "./ui/switch";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type RefObject,
} from "react";
import { useAnimate } from "motion/react";

export function DarkModeSwitch() {
  const [enabled, setEnabled] = useState(false);
  const sunRef: RefObject<SVGSVGElement | null> = useRef(null);
  const moonRef: RefObject<SVGSVGElement | null> = useRef(null);
  const [scope, animate] = useAnimate();

  const handleOnCheckedChange = useCallback(
    (c: boolean) => {
      let next, prev;
      if (c) {
        next = moonRef.current;
        prev = sunRef.current;
      } else {
        prev = moonRef.current;
        next = sunRef.current;
      }

      if (prev) animate(prev, { opacity: 0.2, scale: 0.8 });
      if (next) animate(next, { opacity: 1, scale: 1 });

      setEnabled(c);
      document.documentElement.classList.toggle("dark", c);
      localStorage.setItem("darkMode", c ? "1" : "0");
    },
    [animate],
  );

  useEffect(() => {
    handleOnCheckedChange(localStorage.getItem("darkMode") === "1");
  }, [handleOnCheckedChange]);

  return (
    <div ref={scope} className="flex items-center gap-2">
      <SunIcon ref={sunRef} className="opacity-0" />
      <Switch checked={enabled} onCheckedChange={handleOnCheckedChange} />
      <MoonStarIcon ref={moonRef} className="opacity-0" />
    </div>
  );
}
