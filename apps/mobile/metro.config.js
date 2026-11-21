const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const config = getSentryExpoConfig(__dirname);
config.watchFolders = [root];
config.resolver.nodeModulesPaths = [path.join(__dirname, 'node_modules'), path.join(root, 'node_modules')];
module.exports = config;
