import React from 'react';
import { Switch, View, Text, StyleSheet } from 'react-native';
import { useTheme } from './themeContext';

export const ThemeToggle: React.FC = () => {
    const { theme, colors, toggleTheme } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.text, { color: colors.text }]}>Dark Mode</Text>
            <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: "#767577", true: colors.primary }}
                thumbColor={theme === 'dark' ? "#f5dd4b" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    text: {
        fontSize: 16,
        marginRight: 8,
    },
});

