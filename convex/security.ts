/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitizes user input by removing potentially dangerous characters
 * and normalizing whitespace
 */
export function sanitizeUserInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize Unicode characters to prevent homograph attacks
  sanitized = sanitized.normalize('NFKC');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Collapse multiple spaces/newlines into single ones
  sanitized = sanitized.replace(/\s+/g, ' ');
  sanitized = sanitized.replace(/\n+/g, '\n');

  return sanitized;
}

/**
 * Validates message content length and format
 */
export function validateMessageContent(content: string, maxLength: number = 500): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  // Check if content is a string
  if (typeof content !== 'string') {
    return {
      valid: false,
      error: 'Message content must be a string',
    };
  }

  // Sanitize the input
  const sanitized = sanitizeUserInput(content);

  // Check if empty after sanitization
  if (!sanitized || sanitized.length === 0) {
    return {
      valid: false,
      error: 'Message content cannot be empty',
    };
  }

  // Check length
  if (sanitized.length > maxLength) {
    return {
      valid: false,
      error: `Message content exceeds ${maxLength} character limit`,
    };
  }

  // Check for suspicious patterns (potential injection attempts)
  const suspiciousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,  // Script tags
    /javascript:/gi,                  // JavaScript protocol
    /on\w+\s*=/gi,                   // Event handlers
    /data:text\/html/gi,             // Data URLs
    /<iframe/gi,                     // Iframes
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      return {
        valid: false,
        error: 'Message content contains invalid characters or patterns',
      };
    }
  }

  return {
    valid: true,
    sanitized,
  };
}

/**
 * Validates that the API key is properly formatted and not exposed
 */
export function validateApiKey(apiKey: string | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!apiKey) {
    return {
      valid: false,
      error: 'API key is not configured',
    };
  }

  if (typeof apiKey !== 'string') {
    return {
      valid: false,
      error: 'API key must be a string',
    };
  }

  // Check for OpenRouter API key format
  if (!apiKey.startsWith('sk-or-v1-')) {
    return {
      valid: false,
      error: 'API key format is invalid',
    };
  }

  // Check minimum length (OpenRouter keys are typically 64+ characters)
  if (apiKey.length < 40) {
    return {
      valid: false,
      error: 'API key appears to be incomplete',
    };
  }

  return {
    valid: true,
  };
}

/**
 * Validates authentication token format
 */
export function validateToken(token: string): {
  valid: boolean;
  error?: string;
} {
  if (!token) {
    return {
      valid: false,
      error: 'Authentication token is required',
    };
  }

  if (typeof token !== 'string') {
    return {
      valid: false,
      error: 'Authentication token must be a string',
    };
  }

  // Check for minimum length
  if (token.length < 10) {
    return {
      valid: false,
      error: 'Authentication token is invalid',
    };
  }

  // Check for suspicious characters
  if (!/^[a-zA-Z0-9._\-|:]+$/.test(token)) {
    return {
      valid: false,
      error: 'Authentication token contains invalid characters',
    };
  }

  return {
    valid: true,
  };
}

/**
 * Sanitizes data before including in AI prompts
 * Prevents prompt injection attacks
 */
export function sanitizeForPrompt(data: any): any {
  if (typeof data === 'string') {
    // Remove potential prompt injection patterns
    let sanitized = data;
    
    // Remove system-like instructions
    sanitized = sanitized.replace(/\b(ignore|disregard|forget)\s+(previous|all|above|prior)\s+(instructions?|prompts?|commands?)/gi, '');
    
    // Remove role-switching attempts
    sanitized = sanitized.replace(/\b(you are now|act as|pretend to be|roleplay as)\b/gi, '');
    
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForPrompt(item));
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeForPrompt(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Rate limiting helper - tracks message counts per user
 */
export interface RateLimitConfig {
  maxMessages: number;
  windowMs: number;
}

export function checkRateLimit(
  messageCount: number,
  config: RateLimitConfig = { maxMessages: 50, windowMs: 3600000 } // 50 per hour
): {
  allowed: boolean;
  error?: string;
  resetTime?: number;
} {
  if (messageCount >= config.maxMessages) {
    const resetTime = Date.now() + config.windowMs;
    return {
      allowed: false,
      error: `Rate limit exceeded. Maximum ${config.maxMessages} messages per hour. Try again later.`,
      resetTime,
    };
  }

  return {
    allowed: true,
  };
}
