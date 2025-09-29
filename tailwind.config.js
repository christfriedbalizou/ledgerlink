/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class strategy for dark mode
  content: ["./ui/views/**/*.ejs", "./ui/public/**/*.html", "./ui/public/js/**/*.js"],
  safelist: [
    // Buttons & layout
    "bg-blue-600",
    "hover:bg-blue-700",
    "text-white",
    "font-medium",
    "py-2",
    "px-4",
    "rounded-lg",
    "focus:outline-none",
    "focus:ring-2",
    "focus:ring-blue-500",
    "focus:ring-offset-2",
    "transition-colors",
    // Light backgrounds / text
    "bg-gray-200",
    "hover:bg-gray-300",
    "text-gray-900",
    // Card & utilities
    "border",
    "border-gray-200",
    "p-6",
    "rounded-md",
    "border-gray-300",
    "shadow-sm",
    "w-full",
    "block",
    "inline-flex",
    "items-center",
    "px-2.5",
    "py-0.5",
    "rounded-full",
    "text-xs",
    // Status chips (light)
    "bg-green-100",
    "text-green-800",
    "bg-red-100",
    "text-red-800",
    "bg-yellow-100",
    "text-yellow-800",
    // Dark mode variants that might be dynamically toggled
    'dark:bg-gray-900',
    'dark:text-gray-100',
    'dark:bg-gray-800',
    'dark:border-gray-700',
    'dark:text-gray-300',
    'dark:hover:bg-gray-700',
    'dark:hover:bg-gray-700/50',
    'dark:bg-primary-700/30',
    'dark:text-primary-200',
    'dark:border-primary-400',
    'dark:text-gray-400',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          200: "#bfdbfe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          400: "#60a5fa",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
