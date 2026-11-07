"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import React from "react";

const MotionDiv = React.forwardRef<HTMLHeadingElement, HTMLMotionProps<"div">>(
  ({ children, initial, animate, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={initial ?? { scale: 0.8, opacity: 0 }}
      animate={animate ?? { scale: 1, opacity: 1 }}
      {...props}
    >
      {children}
    </motion.div>
  ),
);

MotionDiv.displayName = "MotionDiv";

export { MotionDiv };
