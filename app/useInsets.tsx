import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useInsets = () => {
    const insets = useSafeAreaInsets();
    return {
        top: Math.max(insets.top, 20),
        bottom: Math.max(insets.bottom, 20),
        left: insets.left,
        right: insets.right,
    };
};