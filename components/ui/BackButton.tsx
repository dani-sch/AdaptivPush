import React from 'react';
import { TouchableOpacity, View} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {PRIMARY_COLOR} from '@/constants/colors';
import {useRouter} from 'expo-router';

export default function BackButton() {
    const router = useRouter();
    return (
        <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-sharp" size={30} color={PRIMARY_COLOR} />
        </TouchableOpacity>
    )
}