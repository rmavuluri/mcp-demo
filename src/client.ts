import { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { LLMMCPIntegration } from './llm-mcp-integration';
import { LLMClient } from './llm-client';
import dotenv from 'dotenv';

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

export class MCPClient {
  private integration: LLMMCPIntegration;
  private llmClient: LLMClient;
  private tools: any[] = [];

  constructor() {
    this.integration = new LLMMCPIntegration();
    this.llmClient = new LLMClient();
  }

  async connectToServer(serverScriptPath: string) {
    try {
      // Initialize MCP and LLM clients
      await this.integration.initialize();
      
      // Get formatted tools for LLM
      this.tools = await this.integration.prepareToolsForLLM();
      console.log(
        "Connected to server with tools:",
        this.tools.map(({ name }) => name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async processQuery(query: string) {
    try {
      const messages: MessageParam[] = [
        {
          role: "user",
          content: query,
        },
      ];

      // Use LLMClient to process the query
      const response = await this.llmClient.sendMessage(messages, { tools: this.tools });

      // Process response
      const finalText = [];
      const toolResults = [];

      // Handle response content
      for (const content of response.content) {
        if (content.type === 'text') {
          finalText.push(content.text);
        } else if (content.type === 'tool_use') {
          toolResults.push(content);
        }
      }

      return {
        text: finalText.join(' '),
        toolResults
      };
    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      if (this.integration) {
        await this.integration.cleanup();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  async chatLoop() {
    try {
      console.log('Starting chat loop...');
      while (true) {
        const query = await this.promptForQuery();
        if (!query) break;

        const result = await this.processQuery(query);
        console.log(`LLM Response: ${result.text}`);
        
        if (result.toolResults.length > 0) {
          console.log('Tool calls executed:', result.toolResults);
        }
      }
    } catch (error) {
      console.error('Error in chat loop:', error);
    }
  }

  private async promptForQuery(): Promise<string | null> {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('Enter your query (or type "exit" to quit): ', (input: string) => {
        rl.close();
        resolve(input.toLowerCase() === 'exit' ? null : input);
      });
    });
  }
}

async function main() {
    if (process.argv.length < 3) {
      console.log("Usage: node index.ts <path_to_server_script>");
      return;
    }
    const mcpClient = new MCPClient();
    try {
      await mcpClient.connectToServer(process.argv[2]);
      await mcpClient.chatLoop();
    } finally {
      await mcpClient.cleanup();
      process.exit(0);
    }
  }
  
  main();