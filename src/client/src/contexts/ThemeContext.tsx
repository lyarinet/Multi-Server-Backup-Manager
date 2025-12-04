import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, themes, applyTheme, getTheme } from '../lib/themes';

interface ThemeContextType {
    currentTheme: Theme;
    setTheme: (themeId: string) => void;
    allThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
        // Load theme from localStorage or detect system preference
        const saved = localStorage.getItem('app-theme');
        if (saved && saved !== 'auto') {
            return getTheme(saved) || themes[0];
        }
        
        // Auto-detect system preference
        if (typeof window !== 'undefined') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return getTheme(prefersDark ? 'dark' : 'light') || themes[0];
        }
        
        return themes[0];
    });

    useEffect(() => {
        // Apply theme on mount and when it changes
        applyTheme(currentTheme);
    }, [currentTheme]);

    useEffect(() => {
        // Listen for system theme changes if auto mode is enabled
        if (typeof window !== 'undefined') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e: MediaQueryListEvent) => {
                const saved = localStorage.getItem('app-theme');
                if (saved === 'auto' || !saved) {
                    const theme = getTheme(e.matches ? 'dark' : 'light');
                    if (theme) {
                        setCurrentTheme(theme);
                    }
                }
            };
            
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, []);

    const setTheme = (themeId: string) => {
        if (themeId === 'auto') {
            // Auto mode - detect system preference
            if (typeof window !== 'undefined') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = getTheme(prefersDark ? 'dark' : 'light');
                if (theme) {
                    setCurrentTheme(theme);
                    localStorage.setItem('app-theme', 'auto');
                }
            }
        } else {
            const theme = getTheme(themeId);
            if (theme) {
                setCurrentTheme(theme);
                localStorage.setItem('app-theme', themeId);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{ currentTheme, setTheme, allThemes: themes }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
