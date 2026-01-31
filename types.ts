export type TradeMode = 'FOREX' | 'BINARIA' | 'LIVE' | 'RADOM';

export interface MarketStatus {
  condition: 'EXCELENTE' | 'ÓTIMO' | 'NEUTRO' | 'PÉSSIMO';
  reason: string;
  timestamp: number;
}

export interface AnalysisResult {
  signal: 'COMPRA' | 'VENDA' | null;
  entrySuggestion: string;
  timestamp: number;
  mode: TradeMode;
  market?: string;
  imagePreview?: string;
  predictionImageUrl?: string;
  groundingUrls?: string[];
  warning?: string;
}

export enum SignalType {
  BUY = 'COMPRA',
  SELL = 'VENDA'
}