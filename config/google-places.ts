// Configuração do Google Places API
// Chave real configurada para o projeto Obra Limpa

export const GOOGLE_PLACES_CONFIG = {
  API_KEY: 'AIzaSyBer6x1O4RAlrkHw8HYhh-lRgrbKlnocEA', // Chave real configurada
  
  // URLs base para as APIs
  PLACES_BASE_URL: 'https://maps.googleapis.com/maps/api/place',
  GEOCODING_BASE_URL: 'https://maps.googleapis.com/maps/api/geocode',
  
  // Configurações padrão
  DEFAULT_COUNTRY: 'br', // Brasil (mantido para geocodificação reversa)
  DEFAULT_LANGUAGE: 'pt-BR',
  DEFAULT_TYPES: 'address',
  
  // Limites e timeouts
  SEARCH_DELAY: 300, // ms
  MAX_RESULTS: 5,
  REQUEST_TIMEOUT: 10000, // ms
};

// Função para obter a chave da API (permite diferentes chaves para diferentes ambientes)
export const getApiKey = (): string => {
  // Em produção, você pode usar variáveis de ambiente
  if (__DEV__) {
    return GOOGLE_PLACES_CONFIG.API_KEY;
  }
  
  // Para produção, use uma chave diferente se necessário
  return GOOGLE_PLACES_CONFIG.API_KEY;
};

// Função para validar se a chave está configurada
export const isApiKeyConfigured = (): boolean => {
  const key = getApiKey();
  return key && key !== 'YOUR_GOOGLE_PLACES_API_KEY' && key.length > 0;
};

// Função para obter URL completa da API
export const getPlacesApiUrl = (endpoint: string, params: Record<string, string>): string => {
  const url = new URL(`${GOOGLE_PLACES_CONFIG.PLACES_BASE_URL}/${endpoint}/json`);
  
  // Adicionar parâmetros
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  // Adicionar chave da API
  url.searchParams.append('key', getApiKey());
  
  return url.toString();
};

// Função para obter URL de geocodificação
export const getGeocodingApiUrl = (params: Record<string, string>): string => {
  const url = new URL(`${GOOGLE_PLACES_CONFIG.GEOCODING_BASE_URL}/json`);
  
  // Adicionar parâmetros
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  // Adicionar chave da API
  url.searchParams.append('key', getApiKey());
  
  return url.toString();
}; 