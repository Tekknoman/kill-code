/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-slow': 'bounce 2s infinite',
            },
            colors: {
                'game': {
                    'dark': '#0f0f0f',
                    'red': '#dc2626',
                    'green': '#16a34a',
                    'blue': '#2563eb',
                    'purple': '#9333ea',
                }
            }
        },
    },
    plugins: [],
}
