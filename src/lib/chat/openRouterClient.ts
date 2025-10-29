export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
      tool_calls?: ToolCall[];
    };
  }>;
}

export interface FunctionDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

/**
 * OpenRouter API client for chat completions with function calling
 */
export class OpenRouterClient {
  private config: OpenRouterConfig;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(config: OpenRouterConfig) {
    this.config = {
      maxTokens: 500,
      temperature: 0.3,
      ...config
    };
  }

  /**
   * Create a chat completion with optional function calling
   */
  async createChatCompletion(
    messages: Message[],
    tools?: FunctionDefinition[],
    toolChoice: 'auto' | 'none' = 'auto'
  ): Promise<ChatCompletionResponse> {
    const requestBody: any = {
      model: this.config.model,
      messages,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature
    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = toolChoice;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Financial Chat Assistant'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenRouter API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('OpenRouter API call failed:', error);
      throw error;
    }
  }

  /**
   * Get the system prompt for the financial assistant
   */
  static getSystemPrompt(): string {
    return `You are a financial assistant helping users understand their spending data.
Use the provided functions to query accurate data. Never estimate or guess numbers.
Provide concise answers (2-3 sentences) that include:
- Specific currency amounts
- Date ranges queried
- Clear comparisons when relevant

If a question is ambiguous (missing timeframe or unclear categories), ask ONE clarifying question before calling functions.
Keep your responses friendly and conversational.`;
  }

  /**
   * Get function definitions for financial data queries
   */
  static getFunctionDefinitions(): FunctionDefinition[] {
    return [
      {
        type: 'function',
        function: {
          name: 'get_category_spending',
          description: 'Get total spending for specific categories in a date range',
          parameters: {
            type: 'object',
            properties: {
              categories: {
                type: 'array',
                items: { type: 'string' },
                description: 'Category names (e.g., ["Coffee", "Restaurant"])'
              },
              timeframe: {
                type: 'string',
                description: 'Natural language timeframe (e.g., "last month", "last 5 months", "this year")'
              }
            },
            required: ['categories', 'timeframe']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_total_spending',
          description: 'Get total spending across all categories for a date range',
          parameters: {
            type: 'object',
            properties: {
              timeframe: {
                type: 'string',
                description: 'Natural language timeframe'
              }
            },
            required: ['timeframe']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'compare_categories',
          description: 'Compare spending between two or more categories',
          parameters: {
            type: 'object',
            properties: {
              categories: {
                type: 'array',
                items: { type: 'string' },
                minItems: 2,
                description: 'At least two category names to compare'
              },
              timeframe: {
                type: 'string',
                description: 'Natural language timeframe'
              }
            },
            required: ['categories', 'timeframe']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_top_categories',
          description: 'Get top N spending categories',
          parameters: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Number of top categories to return (default: 3)'
              },
              timeframe: {
                type: 'string',
                description: 'Natural language timeframe'
              }
            },
            required: ['timeframe']
          }
        }
      }
    ];
  }
}

/**
 * Create an OpenRouter client from environment variables
 */
export function createOpenRouterClient(): OpenRouterClient {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-flash-1.5-8b';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  return new OpenRouterClient({
    apiKey,
    model
  });
}
