import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Tool } from '@anthropic-ai/sdk/resources/messages/messages.mjs';
import { LLMMCPIntegration } from './llm-mcp-integration';
import { LLMClient } from './llm-client';
import { z } from 'zod';

export class CapabilityManager {
    private tools: Tool[] = [];
    private formattedTools: Tool[] = [];
    private resources: any[] = [];
    private resourceTemplates: any[] = [];
    private prompts: any[] = [];
    private client: Client;
    private llmIntegration: LLMMCPIntegration;
    private llmClient: LLMClient;
  
  constructor(client: Client) {
    this.client = client;
    this.llmIntegration = new LLMMCPIntegration();
    this.llmClient = new LLMClient();
    // Set up notification handlers for capability changes
    client.setNotificationHandler(
        z.object({
            method: z.literal('notifications/tools/list_changed')
        }),
        async () => {
            console.log('Tools list changed, refreshing...');
            await this.refreshTools();
        }
    );
    
    client.setNotificationHandler(
        z.object({
            method: z.literal('notifications/resources/list_changed')
        }),
        async () => {
            console.log('Resources list changed, refreshing...');
            await this.refreshResources();
        }
    );
    
    client.setNotificationHandler(
        z.object({
        method: z.literal('notifications/prompts/list_changed')
        }),
        async () => {
            console.log('Prompts list changed, refreshing...');
            await this.refreshPrompts();
        }
    );
  }
  
  async initialize() {
    // Fetch all capabilities
    await Promise.all([
      this.refreshTools(),
      this.refreshResources(),
      this.refreshPrompts()
    ]);
    
    return this;
  }
  
  async refreshTools() {
    try {
      const toolsResult = await this.client.listTools();
      // Transform tools to match Anthropic's Tool type
      this.tools = toolsResult.tools.map(tool => ({
        ...tool,
        input_schema: tool.inputSchema || {} // Convert inputSchema to input_schema
      }));
      
      // Store the formatted tools for LLM usage
      await this.llmIntegration.prepareToolsForLLM();
      this.formattedTools = this.llmIntegration.getFormattedTools();
      console.log('Tools refreshed:', this.tools.length);
    } catch (error) {
      console.error('Error refreshing tools:', error);
    }
  }
  
  async refreshResources() {
    try {
      const result = await this.client.listResources();
      this.resources = result.resources as any[];
      this.resourceTemplates = result.resourceTemplates as any[];
      console.log('Resources refreshed:', this.resources.length);
    } catch (error) {
      console.error('Error refreshing resources:', error);
    }
  }
  
  async refreshPrompts() {
    try {
      const result = await this.client.listPrompts();
      this.prompts = result.prompts;
      return this.prompts;
    } catch (error) {
      console.error('Error refreshing prompts:', error);
      return this.prompts;
    }
  }
  
  getTools() { return this.tools; }
  getResources() { return this.resources; }
  getResourceTemplates() { return this.resourceTemplates; }
  getPrompts() { return this.prompts; }
}