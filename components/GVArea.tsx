// this will be a wrapper to put your components inside. what is does is create a SafeAreaView with
// the statusbar being the same color as PRIMARY_COLOR, with the inner section (VIEW) being white.
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRIMARY_COLOR } from '../constants/colors';

type GVAreaProps = {
    safeAreaColor?: string,
    children?: React.ReactNode
};

export default function GVArea({children, safeAreaColor=PRIMARY_COLOR}: GVAreaProps) {
    return (
        <SafeAreaView style={{
            flex: 1, 
            backgroundColor: safeAreaColor
        }}
        edges={['top', 'left', 'right']}
        >
            <View style={{
                flex: 1,
                backgroundColor: 'white'
            }}>
                {children}
            </View>
        </SafeAreaView>
    )
}