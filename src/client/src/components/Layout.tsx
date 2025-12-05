import React, { useState } from 'react';
import { Button } from './ui/button';
import { 
    Server, 
    Settings, 
    Download, 
    LogOut, 
    Shield,
    Menu,
    X,
    Palette,
    ChevronDown
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface LayoutProps {
    children: React.ReactNode;
    onLogout: () => void;
    isAuthenticated: boolean;
}

export function Layout({ children, onLogout, isAuthenticated }: LayoutProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [themeMenuOpen, setThemeMenuOpen] = useState(false);
    const { currentTheme, setTheme, allThemes } = useTheme();
    const currentRoute = typeof window !== 'undefined' ? (window.location.hash || '#/') : '#/';

    const navigation = [
        { name: 'Servers', href: '#/', icon: Server, current: currentRoute === '#/' || (!currentRoute.startsWith('#/settings') && !currentRoute.startsWith('#/downloads') && !currentRoute.startsWith('#/ip-whitelist')) },
        { name: 'Downloads', href: '#/downloads', icon: Download, current: currentRoute.startsWith('#/downloads') },
        { name: 'Settings', href: '#/settings', icon: Settings, current: currentRoute.startsWith('#/settings') },
        { name: 'IP Whitelist', href: '#/ip-whitelist', icon: Shield, current: currentRoute.startsWith('#/ip-whitelist') },
    ];

    const handleNavClick = (href: string) => {
        window.location.hash = href;
        setMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Desktop Navigation */}
            <nav className="bg-card border-b border-border sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                    <div className="flex justify-between h-14 sm:h-16">
                        <div className="flex flex-1">
                            <div className="flex-shrink-0 flex items-center min-w-0">
                                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-primary truncate">Multi-Server Backup Manager</h1>
                            </div>
                            {isAuthenticated && (
                                <div className="ml-6 flex space-x-1 sm:space-x-8 flex-1">
                                    {navigation.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.name}
                                                onClick={() => handleNavClick(item.href)}
                                                className={`
                                                    inline-flex items-center px-2 sm:px-1 pt-1 border-b-2 text-xs sm:text-sm font-medium transition-colors
                                                    ${item.current
                                                        ? 'border-primary text-foreground'
                                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                                                    }
                                                `}
                                            >
                                                <Icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                                <span className="hidden sm:inline">{item.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        {isAuthenticated && (
                            <div className="ml-4 flex items-center gap-2">
                                {/* Theme Switcher */}
                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                                        className="gap-2"
                                    >
                                        <Palette className="w-4 h-4" />
                                        <span className="hidden sm:inline">{currentTheme.name}</span>
                                        <ChevronDown className="w-3 h-3" />
                                    </Button>
                                    {themeMenuOpen && (
                                        <>
                                            <div 
                                                className="fixed inset-0 z-10" 
                                                onClick={() => setThemeMenuOpen(false)}
                                            />
                                            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-20 py-1">
                                                {allThemes.map((theme) => (
                                                    <button
                                                        key={theme.id}
                                                        onClick={() => {
                                                            setTheme(theme.id);
                                                            setThemeMenuOpen(false);
                                                        }}
                                                        className={`
                                                            w-full text-left px-4 py-2 text-sm transition-colors
                                                            ${currentTheme.id === theme.id
                                                                ? 'bg-accent text-accent-foreground'
                                                                : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                                                            }
                                                        `}
                                                    >
                                                        {theme.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                {/* Logout Button */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onLogout}
                                    className="gap-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden sm:inline">Logout</span>
                                </Button>
                            </div>
                        )}
                        {/* Mobile menu button */}
                        {isAuthenticated && (
                            <div className="sm:hidden flex items-center">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                    aria-label="Toggle menu"
                                >
                                    {mobileMenuOpen ? (
                                        <X className="w-5 h-5" />
                                    ) : (
                                        <Menu className="w-5 h-5" />
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile menu */}
                {isAuthenticated && mobileMenuOpen && (
                    <div className="sm:hidden border-t border-border">
                        <div className="pt-2 pb-3 space-y-1">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.name}
                                        onClick={() => handleNavClick(item.href)}
                                        className={`
                                            w-full flex items-center px-3 py-2 text-base font-medium transition-colors
                                            ${item.current
                                                ? 'bg-accent text-accent-foreground border-l-4 border-primary'
                                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                            }
                                        `}
                                    >
                                        <Icon className="w-5 h-5 mr-3" />
                                        {item.name}
                                    </button>
                                );
                            })}
                            <div className="border-t border-border pt-2 mt-2 space-y-1">
                                {/* Theme Switcher in Mobile */}
                                <div className="px-3 py-2">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Theme</div>
                                    <div className="space-y-1">
                                        {allThemes.map((theme) => (
                                            <button
                                                key={theme.id}
                                                onClick={() => {
                                                    setTheme(theme.id);
                                                    setMobileMenuOpen(false);
                                                }}
                                                className={`
                                                    w-full text-left px-3 py-2 text-sm rounded transition-colors
                                                    ${currentTheme.id === theme.id
                                                        ? 'bg-accent text-accent-foreground'
                                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                                    }
                                                `}
                                            >
                                                {theme.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="border-t border-border pt-2">
                                    <button
                                        onClick={() => {
                                            onLogout();
                                            setMobileMenuOpen(false);
                                        }}
                                        className="w-full flex items-center px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                    >
                                        <LogOut className="w-5 h-5 mr-3" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 overflow-x-hidden">
                {children}
            </main>
        </div>
    );
}

