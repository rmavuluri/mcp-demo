export interface ToolCall {
    name: string;
    input: any;
    id: string;
  }
  
  export interface ToolResult {
    isError: boolean;
    content: Array<{ text?: string }>;
  }
  
  export interface MessageContent {
    type?: string;
    id?: string;
    name?: string;
    input?: any;
    tool_use_id?: string;
    content?: string;
  }
  
  export interface Message {
    role: string;
    content: MessageContent[];
  }
  
  export interface LLMResponse {
    tool_calls?: ToolCall[];
  }
  
  export interface MCPTool {
    name: string;
    description?: string;
    inputSchema?: any;
    input_schema?: any;
  }
  
  export interface MCPToolCallArgs {
    name: string;
    arguments: any;
    _meta?: {
      progressToken?: string | number;
    };
    progressToken?: string | number;
  }