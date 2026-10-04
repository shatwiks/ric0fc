"use client";

import { motion } from "framer-motion";

interface TextRevealProps {
  text: string;
  className?: string;
  italicWord?: string;
  delay?: number;
}

export default function TextReveal({
  text,
  className = "",
  italicWord,
  delay = 0,
}: TextRevealProps) {
  const words = text.split(" ");

  return (
    <span className={`inline-flex flex-wrap gap-x-[0.28em] ${className}`}>
      {words.map((word, i) => {
        const isItalic = italicWord && word.toLowerCase().includes(italicWord.toLowerCase());
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.25 }}
            transition={{
              duration: 0.55,
              delay: delay + i * 0.04,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`inline-block ${isItalic ? "italic" : ""}`}
          >
            {word}
          </motion.span>
        );
      })}
    </span>
  );
}
