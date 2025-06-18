const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@expo/vector-icons']
      }
    },
    argv
  );

  // Personalizações específicas para web
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
    '@': path.resolve(__dirname),
    '@/components': path.resolve(__dirname, 'components'),
    '@/config': path.resolve(__dirname, 'config'),
    '@/services': path.resolve(__dirname, 'services'),
    '@/utils': path.resolve(__dirname, 'utils'),
    '@/hooks': path.resolve(__dirname, 'hooks'),
    '@/assets': path.resolve(__dirname, 'assets')
  };

  // Configuração para resolver problemas de MIME type
  config.module.rules.push({
    test: /\.(js|jsx|ts|tsx)$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
        plugins: ['@babel/plugin-proposal-class-properties']
      }
    }
  });

  // Configuração para resolver problemas de touch events
  config.resolve.fallback = {
    ...config.resolve.fallback,
    'react-native-web': path.resolve(__dirname, 'node_modules/react-native-web')
  };

  // Configuração para resolver problemas de MIME type
  config.output = {
    ...config.output,
    publicPath: '/',
    filename: '[name].bundle.js',
    chunkFilename: '[name].chunk.js'
  };

  return config;
}; 