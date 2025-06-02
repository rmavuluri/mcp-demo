class SecurityManager {
    // Define security policies for different tools
    private toolPolicies: Record<string, { requiresApproval: boolean; maxCallsPerMinute: number }> = {
      'file-write': { requiresApproval: true, maxCallsPerMinute: 5 },
      'execute-command': { requiresApproval: true, maxCallsPerMinute: 2 },
      'read-data': { requiresApproval: false, maxCallsPerMinute: 20 }
    };
    
    // Rate limiting state
    private toolCallCounts: Record<string, { count: number, timestamp: number }> = {};
    
    // Check if a tool call should be allowed
    async checkToolCall(toolName: string, args: any): Promise<boolean> {
      // Get policy for this tool (default is to require approval)
      const policy = this.toolPolicies[toolName] || { requiresApproval: true, maxCallsPerMinute: 10 };
      
      // Check rate limits
      if (!this.checkRateLimit(toolName, policy.maxCallsPerMinute)) {
        console.error(`Rate limit exceeded for tool ${toolName}`);
        return false;
      }
      
      // If approval required, ask user
      if (policy.requiresApproval) {
        return await this.getUserApproval(toolName, args);
      }
      
      // No approval needed and rate limit not exceeded
      return true;
    }
    
    private checkRateLimit(toolName: string, maxCallsPerMinute: number): boolean {
      const now = Date.now();
      
      // Initialize count if not exists
      if (!this.toolCallCounts[toolName]) {
        this.toolCallCounts[toolName] = { count: 0, timestamp: now };
      }
      
      const record = this.toolCallCounts[toolName];
      
      // Reset counter if more than a minute has passed
      if (now - record.timestamp > 60000) {
        record.count = 0;
        record.timestamp = now;
      }
      
      // Increment counter
      record.count++;
      
      // Check if limit exceeded
      return record.count <= maxCallsPerMinute;
    }
    
    private async getUserApproval(toolName: string, args: any): Promise<boolean> {
      console.log(`Tool "${toolName}" requires approval.`);
      console.log('Arguments:', JSON.stringify(args, null, 2));
      console.log('Type "y" to approve, anything else to deny:');
      
      return new Promise(resolve => {
        process.stdin.once('data', data => {
          const input = data.toString().trim().toLowerCase();
          resolve(input === 'y');
        });
      });
    }
  }