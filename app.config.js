module.exports = {
  name: 'Obra Limpa',
  slug: 'obra-limpa',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
    build: {
      babel: {
        include: ['@expo/vector-icons']
      }
    }
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-web-browser',
    '@react-native-firebase/app'
  ],
  experiments: {
    typedRoutes: true,
    tsconfigPaths: true
  }
}; 