import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EDEAE0",
        paperdeep: "#E3DFD2",
        ink: "#17150F",
        inksoft: "#4A473D",
        stencil: "#5A3FB5",
        stencilsoft: "#EDE7FA",
        flashred: "#BE3A2C",
        flashgreen: "#3E5C43",
      },
      fontFamily: {
        mark: ["var(--font-mark)"],
        head: ["var(--font-head)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        press: "4px 4px 0 #17150F",
        pressPurple: "4px 4px 0 #5A3FB5",
      },
    },
  },
  plugins: [],
};
export default config;
