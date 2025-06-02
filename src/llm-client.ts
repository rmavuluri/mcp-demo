import Anthropic from '@anthropic-ai/sdk';
import {
    Tool,
  } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

export class LLMClient {
    private anthropic: Anthropic;
    private tools: Tool[] = [];

    constructor() {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  
    async sendMessage(messages: any, options: { tools?: Tool[] } = {}) {
      try {
        console.log('Sending to LLM:', { messages, options });
        
        // Make actual call to Anthropic API
        const response = await this.anthropic.messages.create({
          model: "claude-3-sonnet-20240229",
          max_tokens: 1024,
          messages: messages,
          tools: options.tools || []
        });
  
        return {
          id: response.id,
          role: response.role,
          content: response.content,
          tool_calls: response.content.filter(c => c.type === 'tool_use') || []
        };
      } catch (error) {
        console.error('Error calling Anthropic API:', error);
        throw error;
      }
    }
  }