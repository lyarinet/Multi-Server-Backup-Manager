export interface Theme {
    id: string;
    name: string;
    description: string;
    preview: {
        primary: string;
        background: string;
        accent: string;
    };
    variables: {
        // Colors
        primary: string;
        primaryForeground: string;
        secondary: string;
        secondaryForeground: string;
        accent: string;
        accentForeground: string;
        background: string;
        foreground: string;
        card: string;
        cardForeground: string;
        muted: string;
        mutedForeground: string;
        border: string;
        input: string;
        ring: string;
        destructive: string;
        destructiveForeground: string;
        // Effects
        shadow: string;
        shadowLg: string;
        radius: string;
        // Visual Style Properties
        borderWidth: string;
        spacing: string;
        animationSpeed: string;
        fontWeight: string;
        letterSpacing: string;
        glassOpacity: string;
        glassBlur: string;
        // Special effects
        glow?: string;
        gradient?: string;
    };
}

export const themes: Theme[] = [
    {
        id: 'dark',
        name: 'Dark Flat UI',
        description: 'Modern dark theme with Flat UI colors - Turquoise & Emerald accents',
        preview: { primary: '#1ABC9C', background: '#2C3E50', accent: '#2ECC71' },
        variables: {
            primary: '174 70% 41%', // Turquoise #1ABC9C
            primaryForeground: '0 0% 100%',
            secondary: '210 29% 24%', // Wet Asphalt #34495E
            secondaryForeground: '174 70% 90%',
            accent: '145 63% 49%', // Emerald #2ECC71
            accentForeground: '210 29% 10%',
            background: '210 29% 18%', // Midnight Blue #2C3E50
            foreground: '174 70% 90%',
            card: '210 29% 22%',
            cardForeground: '174 70% 90%',
            muted: '210 29% 24%',
            mutedForeground: '174 40% 70%',
            border: '210 29% 28%',
            input: '210 29% 24%',
            ring: '174 70% 41%',
            destructive: '6 78% 57%', // Alizarin #E74C3C
            destructiveForeground: '0 0% 100%',
            shadow: '210 29% 5% / 0.4',
            shadowLg: '210 29% 5% / 0.6',
            radius: '0.75rem',
            borderWidth: '1px',
            spacing: '1',
            animationSpeed: '0.25s',
            fontWeight: '400',
            letterSpacing: 'normal',
            glassOpacity: '0.8',
            glassBlur: '12px',
        },
    },
    {
        id: 'light',
        name: 'Light Flat UI',
        description: 'Bright, clean light theme with vibrant Flat UI colors',
        preview: { primary: '#3498DB', background: '#ECF0F1', accent: '#1ABC9C' },
        variables: {
            primary: '204 70% 53%', // Peter River #3498DB
            primaryForeground: '0 0% 100%',
            secondary: '210 4% 95%', // Clouds #ECF0F1
            secondaryForeground: '204 70% 20%',
            accent: '174 70% 41%', // Turquoise #1ABC9C
            accentForeground: '0 0% 100%',
            background: '210 4% 94%', // Clouds #ECF0F1
            foreground: '210 29% 15%', // Wet Asphalt #34495E
            card: '0 0% 100%',
            cardForeground: '210 29% 15%',
            muted: '210 4% 90%',
            mutedForeground: '210 8% 45%', // Concrete #95A5A6
            border: '210 4% 85%',
            input: '210 4% 90%',
            ring: '204 70% 53%',
            destructive: '6 78% 57%', // Alizarin #E74C3C
            destructiveForeground: '0 0% 100%',
            shadow: '210 29% 10% / 0.08',
            shadowLg: '210 29% 10% / 0.12',
            radius: '0.75rem',
            borderWidth: '1px',
            spacing: '1',
            animationSpeed: '0.25s',
            fontWeight: '400',
            letterSpacing: 'normal',
            glassOpacity: '0.95',
            glassBlur: '8px',
        },
    },
    {
        id: 'flat-blue',
        name: 'Flat Blue',
        description: 'Peter River & Belize Hole - Professional blue theme',
        preview: { primary: '#3498DB', background: '#2C3E50', accent: '#2980B9' },
        variables: {
            primary: '204 70% 53%', // Peter River #3498DB
            primaryForeground: '0 0% 100%',
            secondary: '210 29% 24%', // Wet Asphalt #34495E
            secondaryForeground: '204 70% 90%',
            accent: '204 70% 45%', // Belize Hole #2980B9
            accentForeground: '0 0% 100%',
            background: '210 29% 18%', // Midnight Blue #2C3E50
            foreground: '204 70% 90%',
            card: '210 29% 22%',
            cardForeground: '204 70% 90%',
            muted: '210 29% 24%',
            mutedForeground: '204 40% 70%',
            border: '210 29% 28%',
            input: '210 29% 24%',
            ring: '204 70% 53%',
            destructive: '6 78% 57%', // Alizarin #E74C3C
            destructiveForeground: '0 0% 100%',
            shadow: '204 70% 20% / 0.3',
            shadowLg: '204 70% 20% / 0.5',
            radius: '0.75rem',
            borderWidth: '1px',
            spacing: '1',
            animationSpeed: '0.25s',
            fontWeight: '400',
            letterSpacing: 'normal',
            glassOpacity: '0.8',
            glassBlur: '12px',
        },
    },
    {
        id: 'flat-purple',
        name: 'Flat Purple',
        description: 'Amethyst & Wisteria - Elegant purple theme',
        preview: { primary: '#9B59B6', background: '#2C3E50', accent: '#8E44AD' },
        variables: {
            primary: '283 39% 53%', // Amethyst #9B59B6
            primaryForeground: '0 0% 100%',
            secondary: '210 29% 24%', // Wet Asphalt #34495E
            secondaryForeground: '283 39% 90%',
            accent: '282 44% 47%', // Wisteria #8E44AD
            accentForeground: '0 0% 100%',
            background: '210 29% 18%', // Midnight Blue #2C3E50
            foreground: '283 39% 90%',
            card: '210 29% 22%',
            cardForeground: '283 39% 90%',
            muted: '210 29% 24%',
            mutedForeground: '283 30% 70%',
            border: '210 29% 28%',
            input: '210 29% 24%',
            ring: '283 39% 53%',
            destructive: '6 78% 57%', // Alizarin #E74C3C
            destructiveForeground: '0 0% 100%',
            shadow: '283 39% 20% / 0.4',
            shadowLg: '283 39% 20% / 0.6',
            radius: '0.75rem',
            borderWidth: '1px',
            spacing: '1',
            animationSpeed: '0.25s',
            fontWeight: '400',
            letterSpacing: 'normal',
            glassOpacity: '0.8',
            glassBlur: '12px',
        },
    },
    {
        id: 'flat-orange',
        name: 'Flat Orange',
        description: 'Carrot & Orange - Warm and energetic',
        preview: { primary: '#E67E22', background: '#2C3E50', accent: '#F39C12' },
        variables: {
            primary: '24 78% 51%', // Carrot #E67E22
            primaryForeground: '0 0% 100%',
            secondary: '210 29% 24%', // Wet Asphalt #34495E
            secondaryForeground: '24 78% 90%',
            accent: '36 96% 52%', // Orange #F39C12
            accentForeground: '210 29% 10%',
            background: '210 29% 18%', // Midnight Blue #2C3E50
            foreground: '24 78% 90%',
            card: '210 29% 22%',
            cardForeground: '24 78% 90%',
            muted: '210 29% 24%',
            mutedForeground: '24 50% 70%',
            border: '210 29% 28%',
            input: '210 29% 24%',
            ring: '24 78% 51%',
            destructive: '6 78% 57%', // Alizarin #E74C3C
            destructiveForeground: '0 0% 100%',
            shadow: '24 78% 20% / 0.4',
            shadowLg: '24 78% 20% / 0.6',
            radius: '0.75rem',
            borderWidth: '1px',
            spacing: '1',
            animationSpeed: '0.25s',
            fontWeight: '400',
            letterSpacing: 'normal',
            glassOpacity: '0.8',
            glassBlur: '12px',
        },
    },
    {
        id: 'cyberpunk',
        name: 'Cyberpunk Neon',
        description: 'Futuristic with neon colors and glows',
        preview: { primary: '#ff00ff', background: '#0d0221', accent: '#00ffff' },
        variables: {
            primary: '300 100% 50%',
            primaryForeground: '0 0% 100%',
            secondary: '280 100% 20%',
            secondaryForeground: '0 0% 100%',
            accent: '180 100% 50%',
            accentForeground: '0 0% 0%',
            background: '260 85% 7%',
            foreground: '180 100% 90%',
            card: '260 70% 10%',
            cardForeground: '180 100% 90%',
            muted: '280 60% 15%',
            mutedForeground: '180 50% 70%',
            border: '280 100% 30%',
            input: '280 100% 20%',
            ring: '300 100% 50%',
            destructive: '0 100% 50%',
            destructiveForeground: '0 0% 100%',
            shadow: '300 100% 50% / 0.3',
            shadowLg: '300 100% 50% / 0.5',
            radius: '0.25rem',
            borderWidth: '2px',
            spacing: '0.9',
            animationSpeed: '0.15s',
            fontWeight: '500',
            letterSpacing: '0.02em',
            glassOpacity: '0.3',
            glassBlur: '20px',
            glow: '0 0 20px hsl(300 100% 50% / 0.5)',
            gradient: 'linear-gradient(135deg, hsl(300 100% 20%), hsl(260 85% 7%))',
        },
    },
    {
        id: 'nature',
        name: 'Nature Green',
        description: 'Earthy tones with green accents',
        preview: { primary: '#22c55e', background: '#0f1810', accent: '#86efac' },
        variables: {
            primary: '142 71% 45%',
            primaryForeground: '0 0% 100%',
            secondary: '140 30% 20%',
            secondaryForeground: '142 76% 90%',
            accent: '142 76% 73%',
            accentForeground: '140 50% 10%',
            background: '140 40% 8%',
            foreground: '142 76% 90%',
            card: '140 35% 12%',
            cardForeground: '142 76% 90%',
            muted: '140 30% 20%',
            mutedForeground: '142 30% 65%',
            border: '140 30% 25%',
            input: '140 30% 20%',
            ring: '142 71% 45%',
            destructive: '0 84% 60%',
            destructiveForeground: '0 0% 100%',
            shadow: '140 50% 5% / 0.3',
            shadowLg: '140 50% 5% / 0.5',
            radius: '0.75rem',
            borderWidth: '1px',
            spacing: '1.1',
            animationSpeed: '0.3s',
            fontWeight: '400',
            letterSpacing: 'normal',
            glassOpacity: '0.6',
            glassBlur: '12px',
        },
    },
    {
        id: 'ocean',
        name: 'Ocean Blue',
        description: 'Calming blue gradients',
        preview: { primary: '#0ea5e9', background: '#0c1e2e', accent: '#38bdf8' },
        variables: {
            primary: '199 89% 48%',
            primaryForeground: '0 0% 100%',
            secondary: '200 40% 20%',
            secondaryForeground: '199 95% 90%',
            accent: '199 95% 60%',
            accentForeground: '200 50% 10%',
            background: '200 60% 10%',
            foreground: '199 95% 90%',
            card: '200 50% 15%',
            cardForeground: '199 95% 90%',
            muted: '200 40% 20%',
            mutedForeground: '199 40% 70%',
            border: '200 40% 25%',
            input: '200 40% 20%',
            ring: '199 89% 48%',
            destructive: '0 84% 60%',
            destructiveForeground: '0 0% 100%',
            shadow: '200 60% 5% / 0.4',
            shadowLg: '200 60% 5% / 0.6',
            radius: '1rem',
            borderWidth: '1px',
            spacing: '1.05',
            animationSpeed: '0.35s',
            fontWeight: '400',
            letterSpacing: 'normal',
            glassOpacity: '0.5',
            glassBlur: '15px',
            gradient: 'linear-gradient(135deg, hsl(200 60% 15%), hsl(200 60% 10%))',
        },
    },
    {
        id: 'sunset',
        name: 'Sunset Warm',
        description: 'Warm oranges and purples',
        preview: { primary: '#f97316', background: '#1a0f1f', accent: '#fb923c' },
        variables: {
            primary: '25 95% 53%',
            primaryForeground: '0 0% 100%',
            secondary: '280 40% 20%',
            secondaryForeground: '25 95% 90%',
            accent: '25 95% 62%',
            accentForeground: '280 50% 10%',
            background: '280 50% 8%',
            foreground: '25 95% 90%',
            card: '280 40% 12%',
            cardForeground: '25 95% 90%',
            muted: '280 40% 20%',
            mutedForeground: '25 50% 70%',
            border: '280 40% 25%',
            input: '280 40% 20%',
            ring: '25 95% 53%',
            destructive: '0 84% 60%',
            destructiveForeground: '0 0% 100%',
            shadow: '280 50% 5% / 0.3',
            shadowLg: '280 50% 5% / 0.5',
            radius: '0.5rem',
            borderWidth: '1px',
            spacing: '1',
            animationSpeed: '0.25s',
            fontWeight: '400',
            letterSpacing: 'normal',
            glassOpacity: '0.6',
            glassBlur: '12px',
            gradient: 'linear-gradient(135deg, hsl(280 40% 15%), hsl(25 60% 15%))',
        },
    },
    {
        id: 'minimal',
        name: 'Minimal Monochrome',
        description: 'Black, white, and grays only',
        preview: { primary: '#000000', background: '#ffffff', accent: '#404040' },
        variables: {
            primary: '0 0% 0%',
            primaryForeground: '0 0% 100%',
            secondary: '0 0% 96%',
            secondaryForeground: '0 0% 0%',
            accent: '0 0% 25%',
            accentForeground: '0 0% 100%',
            background: '0 0% 100%',
            foreground: '0 0% 0%',
            card: '0 0% 98%',
            cardForeground: '0 0% 0%',
            muted: '0 0% 96%',
            mutedForeground: '0 0% 45%',
            border: '0 0% 90%',
            input: '0 0% 90%',
            ring: '0 0% 0%',
            destructive: '0 0% 20%',
            destructiveForeground: '0 0% 100%',
            shadow: '0 0% 0% / 0.08',
            shadowLg: '0 0% 0% / 0.12',
            radius: '0rem',
            borderWidth: '2px',
            spacing: '1',
            animationSpeed: '0.1s',
            fontWeight: '500',
            letterSpacing: '0.01em',
            glassOpacity: '1',
            glassBlur: '0px',
        },
    },
    {
        id: 'gradient',
        name: 'Gradient Modern',
        description: 'Vibrant gradients and glassmorphism',
        preview: { primary: '#8b5cf6', background: '#0f0a1e', accent: '#ec4899' },
        variables: {
            primary: '258 90% 66%',
            primaryForeground: '0 0% 100%',
            secondary: '260 50% 20%',
            secondaryForeground: '258 90% 90%',
            accent: '330 81% 60%',
            accentForeground: '0 0% 100%',
            background: '260 60% 8%',
            foreground: '258 90% 90%',
            card: '260 50% 12%',
            cardForeground: '258 90% 90%',
            muted: '260 50% 20%',
            mutedForeground: '258 50% 70%',
            border: '260 50% 25%',
            input: '260 50% 20%',
            ring: '258 90% 66%',
            destructive: '0 84% 60%',
            destructiveForeground: '0 0% 100%',
            shadow: '258 90% 30% / 0.3',
            shadowLg: '258 90% 30% / 0.5',
            radius: '1rem',
            borderWidth: '1px',
            spacing: '1.1',
            animationSpeed: '0.3s',
            fontWeight: '400',
            letterSpacing: 'normal',
            glassOpacity: '0.4',
            glassBlur: '20px',
            gradient: 'linear-gradient(135deg, hsl(258 90% 30%), hsl(330 81% 30%))',
        },
    },
];

export function getTheme(id: string): Theme | undefined {
    return themes.find(t => t.id === id);
}

export function applyTheme(theme: Theme) {
    const root = document.documentElement;
    Object.entries(theme.variables).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
    });
}
