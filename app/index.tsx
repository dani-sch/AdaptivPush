import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Dumbbell } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  BACKGROUND_COLOR_DARK, BORDER_COLOR, BUTTON_DISABLED,
  BUTTON_PICKED,
  PLACEHOLDER_TEXT,
  SECONDARY_COLOR_LIGHT,
  TEXT_COLOR,
  WHITE
} from "../constants/colors";

export default function Index() {
    const router = useRouter();


    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Logo */}
                <LinearGradient
                    colors={[BUTTON_PICKED, SECONDARY_COLOR_LIGHT]}
                    style={styles.logo}
                >
                    <Dumbbell color="white" size={60} />
                </LinearGradient>
                {/* Title and Subtitle */}
                <View>
                    <Text style={styles.title}>Welcome to AdaptivPush</Text>
                    <Text style={styles.subtitle}>
                        Adaptive strength training that fits your body and your schedule.
                    </Text>
                </View>

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.signInButton}
                                      onPress={() => router.push('/login')}>
                        <Text style={styles.signInButtonText}>Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.joinButton}
                                      onPress={() => router.push('/join')}>
                        <Text style={styles.joinButtonText}>Join Now</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.joinButton}
                                      onPress={() => router.push('/quick-setup')}>
                        <Text style={styles.joinButtonText}>Dev Skip (Quick Setup)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.joinButton}
                                      onPress={() => router.push('/profile')}>
                        <Text style={styles.joinButtonText}>Dev Skip (Profile)</Text>
                    </TouchableOpacity>

                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity>
                    <Text style={styles.footerLink}>Privacy</Text>
                </TouchableOpacity>
                <Text style={styles.footerDot}>•</Text>
                <TouchableOpacity>
                    <Text style={styles.footerLink}>Terms</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR_DARK,
        justifyContent: 'space-between',
    },
    devSkipButton: {
      position: 'absolute',
      top: 50,
      right: 16,
      backgroundColor: BUTTON_DISABLED,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: PLACEHOLDER_TEXT,
      zIndex: 999,
    },
    devSkipText: {
      color: TEXT_COLOR,
      fontSize: 12,
      fontWeight: '500',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    logoContainer: {
        marginBottom: 48,
        paddingVertical: 100
    },
    logo: {
        width: 120,
        height: 120,
        borderRadius: 30,  // Add rounded corners 
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    logoIcon: {
        fontSize: 60,
    },
    title: {
        fontSize: 32,
        fontWeight: '600',
        color: WHITE,
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: TEXT_COLOR,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 64,
        paddingHorizontal: 20,
    },
    buttonContainer: {
        width: '100%',
        gap: 16,
    },
    signInButton: {
        backgroundColor: BUTTON_PICKED,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    signInButtonText: {
        color: WHITE,
        fontSize: 18,
        fontWeight: '600',
    },
    joinButton: {
        backgroundColor: BORDER_COLOR,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    joinButtonText: {
        color: WHITE,
        fontSize: 18,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 48,
        gap: 12,
    },
    footerLink: {
        color: PLACEHOLDER_TEXT,
        fontSize: 14,
    },
    footerDot: {
        color: PLACEHOLDER_TEXT,
        fontSize: 14,
    },
    buttonText: {
        color: WHITE,
        fontSize: 16,
        fontWeight: '600',
    },
});