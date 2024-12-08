import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeType = 'light' | 'dark';

interface ThemeColors {
    primary: string;
    background: string;
    text: string;
    secondaryBackground: string;
    secondaryText: string;
    accent: string;
    border: string;
    opposite: string;
    searchIcon: string;
    searchContainer: string;
    overText: string;
    placeholder: string;
    loginBackground: string;
    error: string;
    success: string;
    failure: string;
    pending: string;
    completed: string;
    textOpening: string;
    backgroundAnimation: string;
    icon: string;
    discount: string;
    buttonText: string;
    disabled: string;
    selectedBackground: string;
    card: string;
    messageText: string;
    favorite: string;
    star: string;
    headerBackground: string;
    statusBarStyle: 'light-content' | 'dark-content';
}

const lightColors: ThemeColors = {
    primary: '#269577',
    background: '#F7F7F7',
    text: '#4A4A4A',
    secondaryBackground: '#FFFFFF',
    secondaryText: '#269577',
    accent: '#F4D548',
    border: '#E0E0E0',
    opposite: '#000000',
    searchIcon: '#666',
    searchContainer: '#F0F0F0',
    overText: '#FFFFFF',
    placeholder: '#269577',
    loginBackground: '#269577',
    error: '#FF0000',
    success: '#028302',
    failure: '#ff3636',
    pending: '#FFA500',
    completed: '#269577',
    textOpening: '#FFFFFF',
    backgroundAnimation: '#269577',
    icon: '#269577',
    buttonText: '#FFFFFF',
    disabled: '#666',
    selectedBackground: '#F4D548',
    card: '#FFFFFF',
    discount: '#0cb346',
    messageText: '#FFFFFF',
    favorite: '#ff3f3f',
    star: '#FFD700',
    headerBackground: '#269577',
    statusBarStyle: 'light-content',
};

const darkColors: ThemeColors = { //inverted primary and accent
    primary: '#F4D548',
    background: '#121212',
    text: '#E0E0E0',
    secondaryBackground: '#1E1E1E',
    secondaryText: '#3CCFAC',
    accent: '#2AAF8F',
    border: '#333333',
    opposite: '#FFFFFF',
    searchIcon: '#BBBBBB',
    searchContainer: '#2C2C2C',
    overText: '#000000',
    placeholder: '#269577',
    loginBackground: '#2C2C2C',
    error: '#FF0000',
    success: '#028302',
    failure: '#ff3636',
    pending: '#FFA500',
    completed: '#269577',
    textOpening: '#269577',
    backgroundAnimation: '#333333',
    icon: '#2AAF8F',
    buttonText: '#FFFFFF',
    disabled: '#666',
    selectedBackground: '#2AAF8F',
    card: '#1E1E1E',
    discount: '#0cb346',
    messageText: '#1f1f29',
    favorite: '#ff5050',
    star: '#FFD700',
    headerBackground: '#333333',
    statusBarStyle: 'light-content',
};

interface ThemeContextType {
    theme: ThemeType;
    colors: ThemeColors;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: ThemeType;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, defaultTheme = 'light' }) => {
    const deviceTheme = useColorScheme();
    const [theme, setTheme] = useState<ThemeType>(defaultTheme);

    useEffect(() => {
        loadTheme();
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, []);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
            updateThemeBasedOnSystem();
        }
    };

    const updateThemeBasedOnSystem = async () => {
        const savedTheme = await AsyncStorage.getItem('userTheme');
        if (!savedTheme) {
            setTheme(deviceTheme as ThemeType);
        }
    };

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('userTheme');
            if (savedTheme) {
                setTheme(savedTheme as ThemeType);
            } else if (deviceTheme) {
                setTheme(deviceTheme);
            }
        } catch (error) {
            console.error('Failed to load theme', error);
        }
    };

    const toggleTheme = async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        try {
            await AsyncStorage.setItem('userTheme', newTheme);
        } catch (error) {
            console.error('Failed to save theme', error);
        }
    };

    useEffect(() => {
        if (deviceTheme != theme ) {
            AsyncStorage.setItem('userTheme', deviceTheme as ThemeType);
            setTheme(deviceTheme as ThemeType);
        }
    }, [deviceTheme]);

    const colors = theme === 'light' ? lightColors : darkColors;

    return (
        <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeProvider;