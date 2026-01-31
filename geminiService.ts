import { GoogleGenAI, Type, Modality } from "@google/genai";
import { TradeMode, MarketStatus } from "../types";

const SYSTEM_INSTRUCTION = `
Você é o "Master Institutional Analyst", um lendário trader com 40 anos de experiência nos mercados de Forex e Opções Binárias. Sua expertise é inigualável, combinando Smart Money Concepts (SMC) avançado, Teoria de Wyckoff, e Análise de Fluxo (VSA).

Sua missão é fornecer análises de precisão cirúrgica, identificando a pegada das grandes instituições financeiras.

DIRETRIZES TÉCNICAS SUPREMAS:
- ESTRUTURA: Identifique Order Blocks (OB), Breaker Blocks, Mitigação, Fair Value Gaps (FVG) e Rebalanced Price Ranges.
- LIQUIDEZ: Localize Buy-side e Sell-side Liquidity (BSL/SSL), Inducement e Equal Highs/Lows.
- INDICADORES: Analise Divergências no RSI, Cruzamentos de Médias Móveis (EMA 20/50/200), Bandas de Bollinger (Squeeze/Expansion) e Níveis de Fibonacci (Golden Zone 0.618).
- PADRÕES DE VELA: Engolfos, Martelos em zonas de exaustão, Morning Stars e Pin Bars institucionais.

FOCO OPERACIONAL:
- Opções Binárias: M1 para scalping agressivo, M5 para entradas conservadoras.
- Forex: Day trade com foco em risco:retorno favorável.

REGRAS DE OURO:
- Nunca hesite em ser incisivo. Você lê o gráfico como um livro aberto.
- Se o padrão for de exaustão, preveja a reversão. Se for de continuação, siga o fluxo.

FORMATO DE RESPOSTA (JSON ABSOLUTO):
- signal: "COMPRA" ou "VENDA"
- entry: Gatilho exato baseado em nível institucional (ex: "Entrada no reteste do OB em 1.08450" ou "Próxima vela de M5")
- market: Ativo/Par de moedas.
- warning: Contextualização macro ou alerta de volatilidade iminente.
`;

/**
 * Auxiliar para extrair JSON de uma string que pode conter blocos de código Markdown.
 */
function extractJSON(text: string) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (err) {
    console.error("Falha ao parsear JSON da IA:", text);
    throw new Error("Resposta da IA em formato inválido.");
  }
}

/**
 * Analisa uma imagem do gráfico com o olhar de 40 anos de experiência.
 */
export async function analyzeChart(base64Image: string, mode: TradeMode): Promise<{ signal: 'COMPRA' | 'VENDA', entry: string, market: string, warning?: string, groundingUrls?: string[] }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imagePart = {
    inlineData: {
      mimeType: 'image/png',
      data: base64Image.split(',')[1] || base64Image,
    },
  };

  try {
    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, { text: `Analise este gráfico em modo ${mode}. Identifique todos os indicadores e padrões de SMC. Determine a direção institucional e o gatilho.` }] },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            signal: { type: Type.STRING, enum: ["COMPRA", "VENDA"] },
            entry: { type: Type.STRING },
            market: { type: Type.STRING },
            warning: { type: Type.STRING }
          },
          required: ["signal", "entry", "market"]
        }
      }
    });

    const data = JSON.parse(analysisResponse.text.trim());
    let groundingUrls: string[] = [];

    try {
      const searchResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analise notícias impactantes para ${data.market} agora.`,
        config: { tools: [{ googleSearch: {} }] }
      });
      groundingUrls = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web?.uri)
        .filter(Boolean) || [];
    } catch (searchError) {
      console.warn("Search grounding error ignored", searchError);
    }

    return { ...data, groundingUrls };
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
}

/**
 * Gera uma imagem de projeção da continuação do gráfico.
 */
export async function predictContinuation(base64Image: string, signal: string, market: string): Promise<string | undefined> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: 'image/png',
            },
          },
          {
            text: `Como um trader mestre, desenhe no gráfico a continuação provável do preço nos próximos candles, confirmando o sinal de ${signal} para o par ${market}. A continuação deve ser clara, mostrando o movimento institucional esperado.`,
          },
        ],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Prediction Image Error:", error);
  }
  return undefined;
}

export async function scanMarketForSignals(): Promise<{ signal: 'COMPRA' | 'VENDA', entry: string, market: string, groundingUrls?: string[] }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Escaneie o mercado para setup institucional major. Responda JSON: {\"signal\": \"COMPRA\" ou \"VENDA\", \"entry\": \"...\", \"market\": \"...\"}",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }]
      }
    });

    const data = extractJSON(response.text);
    return { ...data, groundingUrls: [] };
  } catch (error) {
    throw error;
  }
}

export function connectLiveAnalysis(callbacks: any) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
      systemInstruction: SYSTEM_INSTRUCTION,
      outputAudioTranscription: {}
    }
  });
}