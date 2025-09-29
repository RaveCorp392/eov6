/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1F7AED",
          50: "#F0F6FF",
          100: "#DCEAFE",
          200: "#BFD7FD",
          300: "#93BCFB",
          400: "#5D9AF7",
          500: "#1F7AED",
          600: "#1661C2",
          700: "#124E99",
          800: "#103F7A",
          900: "#0D345F",
        },
        accent: {
          DEFAULT: "#10B981",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
