import { Client } from "@modelcontextprotocol/sdk/client/index.js";

class McpClientLogger {
    private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';
    private client: Client;
    
    constructor(client: Client, logLevel?: 'debug' | 'info' | 'warn' | 'error') {
      this.client = client;
      if (logLevel) this.logLevel = logLevel;
      
      // Set up client event handlers
      this.setupLogging();
    }
    
    private setupLogging() {
      // Log all requests
    //   this.client.onRequest((method: string, params: any) => {
    //     this.log('debug', `Request: ${method}`, params);
    //   });
      
    //   // Log all responses
    //   this.client.onResponse((method: string, result: any) => {
    //     this.log('debug', `Response: ${method}`, result);
    //   });
      
    //   // Log errors
    //   this.client.onError((error: any) => {
    //     this.log('error', 'Client error:', error);
    //   });
      
    //   // Log notifications
    //   this.client.onNotification((method: string, params: any) => {
    //     this.log('debug', `Notification: ${method}`, params);
    //   });
    }
    
    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) {
      const levels = { debug: 0, info: 1, warn: 2, error: 3 };
      if (levels[level] >= levels[this.logLevel]) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        if (data) {
          console[level](logMessage, data);
        } else {
          console[level](logMessage);
        }
      }
    }
    
    debug(message: string, data?: any) { this.log('debug', message, data); }
    info(message: string, data?: any) { this.log('info', message, data); }
    warn(message: string, data?: any) { this.log('warn', message, data); }
    error(message: string, data?: any) { this.log('error', message, data); }
    
    setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
      this.logLevel = level;
    }
  }