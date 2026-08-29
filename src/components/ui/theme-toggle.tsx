"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./button";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("bhetau-theme");
    const initial = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", initial);
    const frame = window.requestAnimationFrame(() => setDark(initial));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("bhetau-theme", next ? "dark" : "light");
  };
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? "Use light theme" : "Use dark theme"}>
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </Button>
  );
}
