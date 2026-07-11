const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { getDefaultConfig: getExpoDefaultConfig } = require('expo/metro-config');

module.exports = mergeConfig(getDefaultConfig(__dirname), getExpoDefaultConfig(__dirname));
