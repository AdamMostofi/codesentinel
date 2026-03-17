import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CodeSentinel - AI Security Scanner",
  description: "Scan your code for vulnerabilities with AI-powered remediation",
};

/**
 * Theme initialization script
 * Runs on client-side to prevent flash of wrong theme
 * - Checks localStorage for saved preference
 * - Falls back to system preference  
 * - Defaults to dark theme
 * - Applies theme to document
 */
const themeInitScript = `
(function() {
  try {
    var storedTheme = localStorage.getItem('theme');
    var systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (storedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else if (storedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (!storedTheme) {
      // Default to dark theme if no preference stored
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else if (storedTheme === 'system') {
      // System preference - remove data-theme to let CSS media query handle it
      document.documentElement.removeAttribute('data-theme');
    }
  } catch (e) {
    // Fallback to dark theme if localStorage is not available
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme initialization - prevents flash of wrong theme */}
        <script 
          dangerouslySetInnerHTML={{ __html: themeInitScript }} 
        />
        
        {/* Theme toggle click handler - works for all theme toggles on the page */}
        <script 
          dangerouslySetInnerHTML={{ __html: `
            (function() {
              document.addEventListener('click', function(e) {
                var toggleBtn = e.target.closest('.theme-toggle-btn');
                if (!toggleBtn) return;
                
                var theme = toggleBtn.dataset.theme;
                if (!theme) return;
                
                // Apply theme to document
                if (theme === 'system') {
                  document.documentElement.removeAttribute('data-theme');
                  localStorage.removeItem('theme');
                } else {
                  document.documentElement.setAttribute('data-theme', theme);
                  localStorage.setItem('theme', theme);
                }
                
                // Update all toggle button states on the page
                var allToggles = document.querySelectorAll('.theme-toggle');
                allToggles.forEach(function(container) {
                  var buttons = container.querySelectorAll('.theme-toggle-btn');
                  buttons.forEach(function(btn) {
                    var isActive = btn.dataset.theme === theme;
                    btn.setAttribute('aria-checked', isActive);
                    btn.classList.toggle('active', isActive);
                  });
                });
              });
            })();
          `}} 
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
