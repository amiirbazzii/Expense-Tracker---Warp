# Requirements Document

## Introduction

This document specifies the requirements for a Single AI Chat feature that enables users to ask questions about their financial data and receive concise, numeric answers. The chat maintains a persistent history across sessions and uses OpenRouter for AI capabilities with server-side model configuration.

## Glossary

- **Chat_System**: The AI-powered conversational interface that allows users to query their financial data
- **OpenRouter**: The third-party API service used to access large language models
- **Message_History**: The persistent record of all user and assistant messages in the chat thread
- **Clarifying_Question**: A single follow-up question asked by the assistant when user intent is ambiguous
- **Suggested_Prompt**: Pre-written example questions displayed in the empty state to guide users
- **Backend_Calculator**: The server-side component that performs actual data calculations and aggregations
- **User_Data**: The authenticated user's financial transactions, expenses, income, and related information

## Requirements

### Requirement 1

**User Story:** As a user, I want to access a chat interface from the navigation menu, so that I can ask questions about my financial data.

#### Acceptance Criteria

1. WHEN the application loads, THE Chat_System SHALL display a "Chat" navigation item
2. WHEN the user clicks the "Chat" navigation item, THE Chat_System SHALL navigate to the /chat route
3. THE Chat_System SHALL render a chat interface with a message list area and an input field at the bottom
4. WHEN the /chat page loads, THE Chat_System SHALL retrieve and display the Message_History from persistent storage

### Requirement 2

**User Story:** As a user, I want to see suggested prompts when the chat is empty, so that I understand what questions I can ask.

#### Acceptance Criteria

1. WHEN the Message_History is empty, THE Chat_System SHALL display 2 to 3 Suggested_Prompts
2. THE Chat_System SHALL include the following Suggested_Prompts: "How much did I spend on coffee last month?", "Did I spend more on investments or coffee in the last 5 months?", and "Top 3 categories last quarter"
3. WHEN the user clicks a Suggested_Prompt, THE Chat_System SHALL populate the input field with that prompt text
4. WHEN the Message_History contains one or more messages, THE Chat_System SHALL hide the Suggested_Prompts

### Requirement 3

**User Story:** As a user, I want to send questions and receive answers, so that I can learn about my spending patterns.

#### Acceptance Criteria

1. WHEN the user types a message and submits it, THE Chat_System SHALL append the message to the Message_History
2. WHEN a user message is submitted, THE Chat_System SHALL display a "Thinking…" loading indicator
3. WHEN the Backend_Calculator completes processing, THE Chat_System SHALL append the assistant's response to the Message_History
4. THE Chat_System SHALL display timestamps for each message in the Message_History
5. THE Chat_System SHALL include currency symbols and date ranges in numeric answers where relevant

### Requirement 4

**User Story:** As a user, I want the chat history to persist across sessions, so that I can review previous conversations.

#### Acceptance Criteria

1. WHEN the user closes the browser and returns later, THE Chat_System SHALL restore the complete Message_History
2. WHEN the user refreshes the /chat page, THE Chat_System SHALL display all previous messages without loss
3. THE Chat_System SHALL store Message_History in persistent client-side storage indexed by user identifier
4. WHEN the user logs out, THE Chat_System SHALL clear the Message_History for that user session

### Requirement 5

**User Story:** As a user, I want the AI to ask clarifying questions when my request is ambiguous, so that I receive accurate answers.

#### Acceptance Criteria

1. WHEN the user's question lacks a specific timeframe or category, THE Chat_System SHALL generate one Clarifying_Question
2. THE Chat_System SHALL limit clarification to a maximum of one question per user query
3. WHEN the user responds to a Clarifying_Question, THE Chat_System SHALL process the complete request and provide the final answer
4. THE Chat_System SHALL not ask multiple consecutive Clarifying_Questions for a single user intent

### Requirement 6

**User Story:** As a user, I want to receive concise, numeric answers based on my actual data, so that I can trust the information provided.

#### Acceptance Criteria

1. THE Chat_System SHALL compute all numeric results using the Backend_Calculator with User_Data
2. THE Chat_System SHALL not allow the AI model to generate or estimate numeric values
3. WHEN the Backend_Calculator returns aggregated data, THE Chat_System SHALL format the response as a concise answer with specific amounts
4. THE Chat_System SHALL resolve natural language time phrases using the application's existing date utility functions
5. THE Chat_System SHALL not transmit raw transaction tables to the OpenRouter API

### Requirement 7

**User Story:** As a user, I want to see helpful error messages when something goes wrong, so that I know what to do next.

#### Acceptance Criteria

1. WHEN the OpenRouter API call fails, THE Chat_System SHALL display the message "I'm having trouble right now. Please try again."
2. WHEN the Backend_Calculator finds no data matching the query, THE Chat_System SHALL display "I couldn't find transactions for that request. Try another timeframe or category."
3. WHEN an error occurs, THE Chat_System SHALL provide a "Try again" action button
4. WHEN the user clicks "Try again", THE Chat_System SHALL resubmit the previous user message

### Requirement 8

**User Story:** As a system administrator, I want to configure the AI model via environment variables, so that I can change models without code modifications.

#### Acceptance Criteria

1. THE Chat_System SHALL read the OPENROUTER_API_KEY from server-side environment variables
2. THE Chat_System SHALL read the OPENROUTER_MODEL from server-side environment variables
3. THE Chat_System SHALL default to a free OpenRouter model when OPENROUTER_MODEL is not specified
4. THE Chat_System SHALL not expose the model name or API key to client-side code
5. THE Chat_System SHALL not provide any user interface for model selection or configuration

### Requirement 9

**User Story:** As a user, I want the chat to work only with my authenticated data, so that my financial information remains private.

#### Acceptance Criteria

1. THE Chat_System SHALL require user authentication before displaying the chat interface
2. THE Chat_System SHALL pass the authenticated user identifier to the Backend_Calculator
3. THE Chat_System SHALL only access User_Data belonging to the authenticated user
4. THE Chat_System SHALL follow the application's existing privacy and data-access patterns
5. THE Chat_System SHALL not cache or store User_Data in the AI model's context beyond the current request
