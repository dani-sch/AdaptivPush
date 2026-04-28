import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';

export default function BackButton() {
    const router = useRouter();
    const { theme } = useTheme();
    return (
        <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-sharp" size={30} color={theme.primary} />
        </TouchableOpacity>
    )
}
