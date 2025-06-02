import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { LoggingMessageNotificationSchema } from "@modelcontextprotocol/sdk/types.js";

// Define log levels and their priorities
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

export class McpClientLogger {
  private logLevel: LogLevel = 'info';
  private client: Client;

  constructor(client: Client, logLevel?: LogLevel) {
    this.client = client;
    if (logLevel) this.logLevel = logLevel;
    this.setupLogging();
  }

  private setupLogging() {
    // Wrap the client methods to add logging
    const originalListPrompts = this.client.listPrompts;
    this.client.listPrompts = async () => {
      this.log('debug', 'Request: listPrompts');
      try {
        const result = await originalListPrompts.apply(this.client);
        this.log('debug', 'Response: listPrompts', result);
        return result;
      } catch (error) {
        this.log('error', 'Error in listPrompts:', error);
        throw error;
      }
    };

    const originalGetPrompt = this.client.getPrompt;
    this.client.getPrompt = async (params: any) => {
      this.log('debug', 'Request: getPrompt', params);
      try {
        const result = await originalGetPrompt.apply(this.client, [params]);
        this.log('debug', 'Response: getPrompt', result);
        return result;
      } catch (error) {
        this.log('error', 'Error in getPrompt:', error);
        throw error;
      }
    };

    const originalListResources = this.client.listResources;
    this.client.listResources = async () => {
      this.log('debug', 'Request: listResources');
      try {
        const result = await originalListResources.apply(this.client);
        this.log('debug', 'Response: listResources', result);
        return result;
      } catch (error) {
        this.log('error', 'Error in listResources:', error);
        throw error;
      }
    };

    const originalReadResource = this.client.readResource;
    this.client.readResource = async (params: any) => {
      this.log('debug', 'Request: readResource', params);
      try {
        const result = await originalReadResource.apply(this.client, [params]);
        this.log('debug', 'Response: readResource', result);
        return result;
      } catch (error) {
        this.log('error', 'Error in readResource:', error);
        throw error;
      }
    };

    const originalCallTool = this.client.callTool;
    this.client.callTool = async (params: any) => {
      this.log('debug', 'Request: callTool', params);
      try {
        const result = await originalCallTool.apply(this.client, [params]);
        this.log('debug', 'Response: callTool', result);
        return result;
      } catch (error) {
        this.log('error', 'Error in callTool:', error);
        throw error;
      }
    };

    // Set up notification handler for logging messages
    this.client.setNotificationHandler(LoggingMessageNotificationSchema, (notification: any) => {
      this.log('debug', 'Server notification:', notification);
    });
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    const levelPriority = LOG_LEVELS[level];
    const currentLevelPriority = LOG_LEVELS[this.logLevel];

    if (levelPriority >= currentLevelPriority) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      
      // Use console.log for all levels since we're formatting our own messages
      console.log(logMessage, data);
    }
  }

  debug(message: string, data?: unknown) { this.log('debug', message, data); }
  info(message: string, data?: unknown) { this.log('info', message, data); }
  warn(message: string, data?: unknown) { this.log('warn', message, data); }
  error(message: string, data?: unknown) { this.log('error', message, data); }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }
}