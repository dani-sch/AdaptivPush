// SDK 57 initializes React Native globals in expo/src/winter/runtime.native.
// Let the native runtime supply FormData instead of the old SDK 54 placeholder.
require('expo-router/entry');

