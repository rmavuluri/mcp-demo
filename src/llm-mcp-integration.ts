import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import { LLMClient } from './llm-client';
import { Tool } from '@anthropic-ai/sdk/resources/messages/messages.mjs';
import { ToolCall, MessageContent, Message, LLMResponse, MCPTool, MCPToolCallArgs } from './types';
import { CapabilityManager } from './capability-manager';

/**
 * MCP Integration class for managing LLM and MCP client interactions
 */
class LLMMCPIntegration {
  private mcpClient: Client | null = null;
  private llmClient: LLMClient | null = null;
  private formattedTools: Tool[] = [];
  private capabilityManager: CapabilityManager;

  getFormattedTools(): Tool[] {
    return this.formattedTools;
  }

  constructor() {
    this.mcpClient = new Client(
      { name: 'LLMClient', version: '1.0.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );
    this.llmClient = new LLMClient();
    this.capabilityManager = new CapabilityManager(this.mcpClient);
  }

  /**
   * Initialize both MCP and LLM clients
   */
  async initialize() {
    if (this.mcpClient) {
      try {
        // Connect to MCP server
        const transport = new StdioClientTransport({
          command: './server.js',
          args: []
        });
        
        await this.mcpClient.connect(transport);
        console.log('MCP client connected successfully');
        
        // Initialize capability manager to fetch all capabilities
        if (this.capabilityManager) {
          await this.capabilityManager.initialize();
          console.log('Capability manager initialized successfully');
        }
      } catch (error) {
        console.error('Error connecting to MCP server:', error);
        throw error;
      }
    }
  }

  /**
   * Prepare tools from MCP server for LLM format
   */
  async prepareToolsForLLM(): Promise<Tool[]> {
    // Use capability manager to get tools instead of direct listTools call
    if (!this.capabilityManager) {
      throw new Error('Capability manager not initialized');
    }

    // Initialize if not already initialized
    if (!this.capabilityManager.getTools().length) {
      await this.capabilityManager.initialize();
    }

    // Get tools from capability manager
    const tools = this.capabilityManager.getTools();
    
    // Format tools for LLM
    const formattedTools = tools.map((tool: MCPTool) => ({
      name: tool.name,
      description: tool.description || `Tool: ${tool.name}`,
      input_schema: tool.inputSchema || {}
    }));
    
    return formattedTools;
  }

  /**
   * Query LLM with available tools
   */
  async queryLLMWithTools(userQuery: string): Promise<LLMResponse> {
    const messages: Message[] = [
      { role: 'user', content: [{ content: userQuery }] }
    ];
    
    const formattedTools = await this.prepareToolsForLLM();
    
    const response = await this.llmClient!.sendMessage(messages, {
      tools: formattedTools
    });
    
    return response;
  }

  /**
   * Process LLM response and handle tool calls
   */
  async processLLMResponse(llmResponse: LLMResponse, messages: Message[]): Promise<void> {
    // Check if the LLM wants to call a tool
    if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
      // Process each tool call
      for (const toolCall of llmResponse.tool_calls) {
        const { name, input, id } = toolCall;
        
        console.log(`LLM wants to call tool: ${name}`);
        console.log('Tool arguments:', input);
        
        // Get user approval
        const userApproved = await this.getUserApproval(name, input);
        
        if (userApproved) {
          try {
            // Call the tool using MCP
            const toolResult = await this.mcpClient!.callTool({
              name,
              arguments: input
            });
            
            // Add the tool call to the message history
            messages.push({
              role: 'assistant',
              content: [{ type: 'tool_use', id, name, input }]
            });
            
            // Add the tool result to the message history
            messages.push({
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: id,
                content: toolResult.isError 
                  ? `Error: ${Array.isArray(toolResult.content) && toolResult.content[0]?.text ? toolResult.content[0].text : 'Unknown error'}` 
                  : Array.isArray(toolResult.content) && toolResult.content[0]?.text ? toolResult.content[0].text : 'No content available'
              }]
            });
          } catch (error: unknown) {
            console.error(`Error calling tool ${name}:`, error);
            
            // Add error information to the message history
            messages.push({
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: id,
                content: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
              }]
            });
          }
        } else {
          // User didn't approve the tool call
          messages.push({
            role: 'user',
            content: [{ content: `Tool call to ${name} was not approved by the user.` }]
          });
        }
      }
      
      // Send the updated conversation back to the LLM
      const newResponse = await this.llmClient!.sendMessage(messages);
      
      // Recursively process the new response
      await this.processLLMResponse(newResponse, messages);
    }
    
    // If no tool calls, just return
    return;
  }

  /**
   * Get user approval for tool calls
   */
  async getUserApproval(toolName: string, args: any): Promise<boolean> {
    return new Promise((resolve) => {
      console.log(`\n--- Tool Approval Required ---`);
      console.log(`Tool: ${toolName}`);
      console.log('Arguments:', JSON.stringify(args, null, 2));
      
      const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('Approve? (y/n): ', (answer: string) => {
        rl.close();
        resolve(answer.trim().toLowerCase() === 'y');
      });
    });
  }

  /**
   * Manage complete conversation context with tool calls
   */
  async manageConversation(userQuery: string): Promise<Message[]> {
    // Initialize messages array
    const messages: Message[] = [
      { role: 'user', content: [{ content: userQuery }] }
    ];
    
    // Get available tools
    const tools = await this.prepareToolsForLLM();
    
    // Send initial request to LLM
    let llmResponse = await this.llmClient!.sendMessage(messages, { tools });
    
    // Process response and handle any tool calls
    await this.processLLMResponse(llmResponse, messages);
    
    // Return the final messages array
    return messages;
  }



  /**
   * Clean up connections
   */
  async cleanup() {
    if (this.mcpClient) {
      try {
        await this.mcpClient.close();
        this.mcpClient = null;
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }
    this.llmClient = null;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    const integration = new LLMMCPIntegration();
    await integration.initialize();
    
    // Example usage
    const userQuery = 'What tools are available?';
    const messages = await integration.manageConversation(userQuery);
    console.log('Final messages:', messages);
    
    await integration.cleanup();
  } catch (error) {
    console.error('Error in main execution:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Example usage
async function runExample() {
  const integration = new LLMMCPIntegration();
  await integration.initialize();
  
  const userQuery = "What tools are available and can you help me with a task?";
  const messages = await integration.manageConversation(userQuery);
  
  console.log('\n--- Final Conversation Result ---');
  console.log('Messages:', JSON.stringify(messages, null, 2));
  
  await integration.cleanup();
}

// Run example if this file is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

// Export for use as module
export { LLMMCPIntegration, LLMClient };