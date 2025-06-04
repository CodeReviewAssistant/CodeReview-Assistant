import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    } else {
      // Check for system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !darkMode;
    setDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return {
    darkMode,
    toggleTheme
  };
};