import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouterClient, OpenRouterClient, Message } from '@/lib/chat/openRouterClient';
import { DataAggregator } from '@/lib/chat/dataAggregator';
import { resolveDateRange } from '@/lib/chat/dateUtils';

// Error codes for client-side handling
export enum ChatErrorCode {
  API_ERROR = 'API_ERROR',
  NO_DATA = 'NO_DATA',
  AUTH_ERROR = 'AUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT'
}

interface ChatRequest {
  message: string;
  conversationHistory?: Message[];
  isRespondingToClarification?: boolean;
}

interface ChatResponse {
  message: string;
  timestamp: number;
  requiresClarification?: boolean;
}

interface ChatError {
  error: string;
  code: ChatErrorCode;
}

/**
 * Clean protocol tokens from model responses
 * Some models (especially free ones) may include control tokens in their output
 */
function cleanProtocolTokens(content: string): string {
  if (!content) return content;
  
  // Remove common protocol tokens - order matters!
  let cleaned = content
    // First, remove everything before and including <|message|>
    .replace(/^[\s\S]*?<\|message\|>/, '')
    // Remove <|call|> and everything after it
    .replace(/<\|call\|>[\s\S]*$/, '')
    // Remove any remaining protocol tokens
    .replace(/<\|start\|>/g, '')
    .replace(/<\|end\|>/g, '')
    .replace(/<\|assistant\|>/g, '')
    .replace(/<\|user\|>/g, '')
    .replace(/<\|system\|>/g, '')
    .replace(/<\|channel\|>/g, '')
    .replace(/<\|commentary[^|]*\|>/g, '')
    .replace(/<\|constrain\|>[^<]*/g, '')
    // Remove any remaining angle bracket tokens
    .replace(/<\|[^|]+\|>/g, '')
    // Clean up extra whitespace
    .trim();
  
  return cleaned;
}

/**
 * Validate incoming chat request
 */
function validateRequest(body: any): { valid: boolean; error?: string } {
  if (!body.message || typeof body.message !== 'string') {
    return { valid: false, error: 'Message is required and must be a string' };
  }

  if (body.message.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (body.message.length > 500) {
    return { valid: false, error: 'Message too long (max 500 characters)' };
  }

  return { valid: true };
}

/**
 * Extract auth token from request headers
 */
function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Execute a function call from OpenRouter
 */
async function executeFunction(
  functionName: string,
  args: any,
  token: string,
  aggregator: DataAggregator
): Promise<any> {
  try {
    // Resolve timeframe to date range
    const dateRange = resolveDateRange(args.timeframe || 'this month', false);

    switch (functionName) {
      case 'get_category_spending': {
        const result = await aggregator.getCategorySpending(
          token,
          args.categories,
          dateRange.start,
          dateRange.end
        );
        return {
          categories: result,
          dateRange: dateRange.description,
          hasData: result.length > 0
        };
      }

      case 'get_total_spending': {
        const result = await aggregator.getTotalSpending(
          token,
          dateRange.start,
          dateRange.end
        );
        return {
          total: result.total,
          count: result.count,
          dateRange: dateRange.description,
          hasData: result.count > 0
        };
      }

      case 'get_top_categories': {
        const limit = args.limit || 3;
        const result = await aggregator.getTopCategories(
          token,
          dateRange.start,
          dateRange.end,
          limit
        );
        return {
          categories: result,
          dateRange: dateRange.description,
          hasData: result.length > 0
        };
      }

      case 'compare_categories': {
        const result = await aggregator.compareCategories(
          token,
          args.categories,
          dateRange.start,
          dateRange.end
        );
        return {
          comparison: result,
          dateRange: dateRange.description,
          hasData: result.categories.length > 0
        };
      }

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  } catch (error) {
    console.error(`Error executing function ${functionName}:`, error);
    throw error;
  }
}

/**
 * Check if conversation history contains a clarification question
 */
function hasClarificationInHistory(conversationHistory: Message[]): boolean {
  // Look for assistant messages with requiresClarification metadata
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    if (msg.role === 'assistant') {
      // Check if this is a clarification question (contains '?' and is recent)
      if (msg.content.includes('?')) {
        return true;
      }
      // Stop at first assistant message to only check recent context
      break;
    }
  }
  return false;
}

/**
 * Process chat message with function calling
 */
async function processChatMessage(
  userMessage: string,
  conversationHistory: Message[],
  token: string,
  client: OpenRouterClient,
  aggregator: DataAggregator,
  isRespondingToClarification: boolean = false
): Promise<{ message: string; requiresClarification: boolean }> {
  // Build message history
  const messages: Message[] = [
    { role: 'system', content: OpenRouterClient.getSystemPrompt() },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  // Get function definitions
  const tools = OpenRouterClient.getFunctionDefinitions();

  // Check if we already asked for clarification in this conversation thread
  const alreadyAskedClarification = hasClarificationInHistory(conversationHistory);

  // Initial call to OpenRouter
  const initialResponse = await client.createChatCompletion(messages, tools, 'auto');
  const assistantMessage = initialResponse.choices[0].message;

  // Check if function call was requested
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    const toolCall = assistantMessage.tool_calls[0];
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    console.log(`Executing function: ${functionName}`, functionArgs);

    // Execute the function with user's data
    const functionResult = await executeFunction(functionName, functionArgs, token, aggregator);

    // Check if we have data
    if (!functionResult.hasData) {
      return {
        message: "I couldn't find transactions for that request. Try another timeframe or category.",
        requiresClarification: false
      };
    }

    // Send function result back to OpenRouter for natural language response
    const finalMessages: any[] = [
      ...messages,
      {
        role: 'assistant',
        content: assistantMessage.content || '',
        tool_calls: assistantMessage.tool_calls
      },
      {
        role: 'tool',
        content: JSON.stringify(functionResult),
        tool_call_id: toolCall.id
      }
    ];

    const finalResponse = await client.createChatCompletion(finalMessages);
    const rawContent = finalResponse.choices[0].message.content;
    
    // Clean up any protocol tokens that might be in the response
    const cleanedContent = cleanProtocolTokens(rawContent);
    
    // If cleaning resulted in empty content, provide a fallback
    if (!cleanedContent || cleanedContent.trim().length === 0) {
      console.warn('Cleaned content is empty, using fallback response');
      // Generate a simple response from the function result
      if (functionResult.categories && functionResult.categories.length > 0) {
        const category = functionResult.categories[0];
        return {
          message: `You spent $${category.total.toFixed(2)} on ${category.category} ${functionResult.dateRange}.`,
          requiresClarification: false
        };
      } else if (functionResult.total !== undefined) {
        return {
          message: `Your total spending was $${functionResult.total.toFixed(2)} ${functionResult.dateRange}.`,
          requiresClarification: false
        };
      }
    }
    
    return {
      message: cleanedContent,
      requiresClarification: false
    };
  }

  // Direct response (likely a clarification question or general response)
  const rawContent = assistantMessage.content;
  
  // Clean up any protocol tokens that might be in the response
  const content = cleanProtocolTokens(rawContent);
  
  // Determine if this is a clarification question
  // Only mark as clarification if:
  // 1. It contains a question mark
  // 2. We haven't already asked for clarification in this thread
  // 3. The conversation is relatively short (not responding to clarification)
  const isClarification = 
    content.includes('?') && 
    !alreadyAskedClarification && 
    !isRespondingToClarification;

  return {
    message: content,
    requiresClarification: isClarification
  };
}

/**
 * POST /api/chat
 * Handle chat messages with function calling
 */
export async function POST(request: NextRequest) {
  try {
    // Extract and validate auth token
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', code: ChatErrorCode.AUTH_ERROR } as ChatError,
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body: ChatRequest = await request.json();
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, code: ChatErrorCode.VALIDATION_ERROR } as ChatError,
        { status: 400 }
      );
    }

    // Initialize OpenRouter client and data aggregator
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured');
    }

    const client = createOpenRouterClient();
    const aggregator = new DataAggregator(convexUrl);

    // Process the message
    const conversationHistory = body.conversationHistory || [];
    const isRespondingToClarification = body.isRespondingToClarification || false;
    const result = await processChatMessage(
      body.message,
      conversationHistory,
      token,
      client,
      aggregator,
      isRespondingToClarification
    );

    // Return response
    const response: ChatResponse = {
      message: result.message,
      timestamp: Date.now(),
      requiresClarification: result.requiresClarification
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Chat API error:', error);

    // Handle specific error types
    if (error.message?.includes('Authentication required')) {
      return NextResponse.json(
        { error: 'Your session has expired. Please log in again.', code: ChatErrorCode.AUTH_ERROR } as ChatError,
        { status: 401 }
      );
    }

    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.', code: ChatErrorCode.RATE_LIMIT } as ChatError,
        { status: 429 }
      );
    }

    if (error.message?.includes('OpenRouter')) {
      return NextResponse.json(
        { error: "I'm having trouble right now. Please try again.", code: ChatErrorCode.API_ERROR } as ChatError,
        { status: 503 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: "I'm having trouble right now. Please try again.", code: ChatErrorCode.API_ERROR } as ChatError,
      { status: 500 }
    );
  }
}
