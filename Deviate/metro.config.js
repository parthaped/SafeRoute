const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.extraNodeModules = require('node-libs-react-native');

module.exports = config;
