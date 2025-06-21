// Configuração do console para suprimir avisos específicos
const originalWarn = console.warn;
const originalError = console.error;

// Lista de avisos para suprimir
const suppressedWarnings = [
  'shadow* style props are deprecated',
  'props.pointerEvents is deprecated',
  'Unexpected text node',
  'Layout children must be of type Screen',
  'expo-notifications] Listening to push token changes is not yet fully supported on web'
];

// Função para verificar se o aviso deve ser suprimido
function shouldSuppressWarning(message) {
  return suppressedWarnings.some(suppressed => 
    message.includes(suppressed)
  );
}

// Sobrescrever console.warn
console.warn = function(...args) {
  const message = args.join(' ');
  if (!shouldSuppressWarning(message)) {
    originalWarn.apply(console, args);
  }
};

// Sobrescrever console.error para alguns casos específicos
console.error = function(...args) {
  const message = args.join(' ');
  if (!shouldSuppressWarning(message)) {
    originalError.apply(console, args);
  }
};

// Configuração para React Native Web
if (typeof window !== 'undefined') {
  // Suprimir avisos específicos do React Native Web
  const originalConsoleWarn = window.console.warn;
  window.console.warn = function(...args) {
    const message = args.join(' ');
    if (!shouldSuppressWarning(message)) {
      originalConsoleWarn.apply(window.console, args);
    }
  };
}

export default console; 