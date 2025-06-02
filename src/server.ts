#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Define a Task type
type Task = {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
};

// In-memory task storage for demonstration
const tasks: Record<string, Task> = {};

// Create MCP server
const server = new McpServer({
  name: "Task - CRUD Server",
  version: "1.0.0",
});

// Generate a simple UUID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Define a tool to create a task
server.tool(
  "createTask",
  {
    title: z.string().min(1).describe("Title of the task"),
    description: z.string().optional().describe("Description of the task"),
    priority: z.enum(["low", "medium", "high"]).default("medium").describe("Task priority"),
  },
  async ({ title, description, priority }) => {
    const taskId = generateId();
    tasks[taskId] = { title, description, priority, createdAt: new Date().toISOString() };
    return {
      content: [{
        type: "text",
        text: `Task "${title}" created with ID: ${taskId}`,
      }],
    };
  }
);

// Define a tool to list all tasks
server.tool(
  "listTasks",
  {},
  async () => {
    const taskList = Object.entries(tasks).map(([id, task]) => ({
      id,
      ...task
    }));
    return {
      content: [{
        type: "text",
        text: JSON.stringify(taskList, null, 2),
      }],
    };
  }
);

// Define a tool to get a specific task
server.tool(
  "getTask",
  {
    taskId: z.string().describe("ID of the task to retrieve"),
  },
  async ({ taskId }) => {
    const task = tasks[taskId];
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ id: taskId, ...task }, null, 2),
      }],
    };
  }
);

// Define a tool to update a task
server.tool(
  "updateTask",
  {
    taskId: z.string().describe("ID of the task to update"),
    title: z.string().optional().describe("New title for the task"),
    description: z.string().optional().describe("New description for the task"),
    priority: z.enum(["low", "medium", "high"]).optional().describe("New priority for the task"),
  },
  async ({ taskId, title, description, priority }) => {
    const task = tasks[taskId];
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    
    return {
      content: [{
        type: "text",
        text: `Task ${taskId} updated successfully`,
      }],
    };
  }
);

// Define a tool to delete a task
server.tool(
  "deleteTask",
  {
    taskId: z.string().describe("ID of the task to delete"),
  },
  async ({ taskId }) => {
    const task = tasks[taskId];
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    delete tasks[taskId];
    return {
      content: [{
        type: "text",
        text: `Task ${taskId} deleted successfully`,
      }],
    };
  }
);

// Define a resource template for tasks
server.resource(
  "task",
  "task://{taskId}",
  async (uri) => {
    // Extract taskId from URI
    const match = uri.href.match(/task:\/\/(.+)/);
    if (!match) {
      throw new Error("Invalid task URI");
    }
    
    const taskId = match[1];
    const task = tasks[taskId];
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify({ id: taskId, ...task }, null, 2),
        mimeType: "application/json",
      }],
    };
  }
);

// Define a prompt to generate a task summary
server.prompt(
  "summarizeTask",
  "Generates a concise summary of a task for LLM processing",
  {
    taskId: z.string().describe("ID of the task to summarize"),
  },
  async ({ taskId }) => {
    const task = tasks[taskId];
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    const promptText = `Summarize the following task:\nTitle: ${task.title}\nDescription: ${task.description || "No description"}\nPriority: ${task.priority}`;
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: promptText,
        },
      }],
    };
  }
);

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Keep the process running
  console.error("MCP Task Manager Server started successfully");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});