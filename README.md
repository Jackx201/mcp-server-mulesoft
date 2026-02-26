# MCP Server MuleSoft — Template Project

This is a small MCP (Model Context Protocol) test server built with MuleSoft to demonstrate how to configure and implement MCP servers that can be consumed by AI clients such as Claude or GitHub Copilot.

## What is MCP?

MCP (Model Context Protocol) is a protocol that standardizes how AI applications interact with external data sources and tools. An MCP server exposes "tools" that AI models can discover and call.

## Server Architecture

```
MCP Client (Agent / Inspector)
    ↓ SSE (Server-Sent Events)
MCP Server (MuleSoft - localhost:8080)
    ↓ Tool Listeners (4 tools exposed)
MuleSoft flows
    ↓ HTTP Requests
JSONPlaceholder API (https://jsonplaceholder.typicode.com)
```

## Available Tools

This server exposes four tools that interact with the public JSONPlaceholder API:

### 1. get-all-posts
- Description: Retrieves all blog posts
- Parameters: None
- Response: List of 100 posts (title, body, userId)

### 2. get-post-by-id
- Description: Retrieves a single post by its ID
- Parameters:
   - `postId` (integer, 1-100): ID of the post to fetch
- Response: Single post with full details

### 3. get-users
- Description: Retrieves the list of all users
- Parameters: None
- Response: List of users (name, email, city)

### 4. get-user-posts
- Description: Retrieves all posts for a specific user
- Parameters:
   - `userId` (integer): ID of the user
- Response: List of posts for the specified user

## Prerequisites

- Java 17
- Maven 3.x
- Mule Runtime 4.9.6 or newer
- Anypoint Studio (optional for visual development)

## Setup & Run

### 1. Open the project

```bash
cd mcp-server-mulesoft
```

### 2. Start the server

Option A: Using Maven

```bash
mvn clean install
mvn mule:run
```

Option B: Using Anypoint Studio

1. Import the project into Anypoint Studio
2. Right-click the project → Run As → Mule Application
3. Add this VM arg to the run configuration: `-M-Dmule.http.service.implementation=NETTY`

### 3. Verify the server is running

```bash
curl http://localhost:8080/api/sse
```

This command should keep the connection open (press Ctrl+C to exit).

## Test with MCP Inspector

MCP Inspector is a visual tool to debug and test MCP servers.

```bash
npx @modelcontextprotocol/inspector http://localhost:8080/sse
```

The inspector will open a browser UI where you can:
- View the four available tools
- Try each tool with interactive inputs
- Inspect JSON-RPC messages in real time
- Debug errors and responses

If the inspector port is in use:

```bash
# Kill the previous process (UNIX example)
kill $(lsof -ti:6274)

# Or use a different port
PORT=6275 npx @modelcontextprotocol/inspector http://localhost:8080/sse
```

## Test with cURL (manual MCP session)

You can also test the server manually with cURL using an SSE session.

```bash
# 1. Create an SSE session
curl http://localhost:8080/api/sse

# This call returns a SESSION_ID — use it for subsequent requests

# 2. Initialize the MCP session
curl -X POST "http://localhost:8080/message?sessionId=${SESSION_ID}" \
 -H "Content-Type: application/json" \
 -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
       "protocolVersion": "2024-11-05",
       "capabilities": {},
       "clientInfo": {"name": "test", "version": "1.0.0"}
    },
    "id": 1
 }'

# 2.1 Notify that the MCP session is initialized
curl -X POST "http://localhost:8080/message?sessionId=${SESSION_ID}" \
 -H "Content-Type: application/json" \
 -d '{
    "jsonrpc": "2.0",
    "method": "notifications/initialized",
    "id": 1
 }'

# 3. Call a tool (example: get-users)
curl -X POST "http://localhost:8080/message?sessionId=${SESSION_ID}" \
 -H "Content-Type: application/json" \
 -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
       "name": "get-users",
       "arguments": {}
    },
    "id": 2
 }'
```

## Integrate with your Copilot Agent

To use this server from Copilot:

1. Add a server configuration in `.vscode/mcp.json`:

```json
{
   "servers": {
      "My-MCP-Server": {
         "url": "http://localhost:8080/mcp",
         "type": "http"
      }
   },
   "inputs": []
}
```

2. Ensure your chatbot has MCP servers enabled in its settings.
3. Open the tools pane in your chatbot — you should see the four tools available.

## Key Concepts

### 1. MCP Server Configuration

```xml
<mcp:server-config name="Server" serverName="mule-mcp-server" serverVersion="1.0.0">
    <mcp:streamable-http-server-connection listenerConfig="HTTP-Listener-config"/>
</mcp:server-config>
```

### 2. Defining a Tool

```xml
<mcp:tool-listener name="tool-name" config-ref="Server">
    <mcp:description>Tool description</mcp:description>
    <mcp:parameters-schema><![CDATA[{
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
                "param1": {
                      "type": "string",
                      "description": "Parameter description"
                }
          },
          "required": ["param1"]
    }]]></mcp:parameters-schema>
    <mcp:responses>
          <mcp:text-tool-response-content text="#[payload.^raw]" />
    </mcp:responses>
</mcp:tool-listener>
```

### 3. Accessing Parameters

Parameters sent by the MCP client are available on the `payload`:

```xml
<set-variable variableName="userId" value="#[payload.userId]" />
```

### 4. Response Format

Make sure each tool includes a `<mcp:responses>` block with `<mcp:text-tool-response-content>`:

```xml
<mcp:responses>
    <mcp:text-tool-response-content text="#[payload.^raw]" />
</mcp:responses>
```

### 5. MCP SSE Communication Flow

1. Client connects via SSE: `GET /api/sse`
2. Handshake: `initialize` request
3. Discovery: `tools/list` request
4. Execution: `tools/call` with parameters
5. Response: Server returns the result in MCP format

## Project Structure

```
mcp-server-mulesoft/
├── pom.xml                       # Maven configuration
├── mule-artifact.json            # Mule application metadata
├── src/
│   └── main/
│       ├── mule/
│       │   └── mcp-server-mulesoft.xml   # Flows & tool definitions
│       └── resources/
│           └── log4j2.xml        # Logging configuration
└── README.md                     # This file
```

## Troubleshooting

### Empty responses ("content: []")

Cause: `<mcp:responses>` is not configured correctly.

Fix: Ensure every tool includes:

```xml
<mcp:responses>
    <mcp:text-tool-response-content text="#[payload.^raw]" />
</mcp:responses>
```

### SSL/TLS errors when calling external APIs

Cause: The JVM does not trust the external API certificate.

Fix (development only):

```xml
<tls:context>
    <tls:trust-store insecure="true"/>
</tls:context>
```

Note: In production add the certificates to the Java truststore.

### "Invalid input" in inputSchema

Cause: Missing `$schema` field in the JSON Schema.

Fix: Include the `$schema` declaration:

```json
{
   "$schema": "http://json-schema.org/draft-07/schema#",
   "type": "object",
   ...
}
```

### Inspector port 6274 already in use

Cause: Another instance of the Inspector is running.

Fix:

- Stop the running process with Ctrl+C in its terminal, or
- Kill the process manually and restart the Inspector:

```bash
kill $(lsof -ti:6274)
# Or run Inspector on another port
PORT=6275 npx @modelcontextprotocol/inspector http://localhost:8080/api/sse
```

## Additional Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MuleSoft MCP Connector Documentation](https://docs.mulesoft.com/)
- [JSONPlaceholder API](https://jsonplaceholder.typicode.com/)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)

## License

This is an educational open-source project. Feel free to use, modify, and distribute.

# Demo

Once your MCP server is deployed and connected to your agent.

<img width="1317" height="458" alt="image" src="https://github.com/user-attachments/assets/1a6b80ce-c7c5-468e-a6d8-0ad6f0914eb9" />

You can ask your agent to provide a list of all users from JSON Placeholder. Since it is a public API, the agent might try to perform a direct fetch; if that happens, you can specify that it should use the get-users tool programmed in our local MCP server.


<img width="1575" height="689" alt="image" src="https://github.com/user-attachments/assets/310f41ef-7cbd-400f-97c6-67c31d3acea4" />


The data provided by the agent in its response will depend entirely on the prompt you provide. You can view the full result by clicking on the dialog where the tool was executed, where you will find the raw response containing all the data the agent obtained by consuming your tool.

<img width="1561" height="1085" alt="image" src="https://github.com/user-attachments/assets/8f4a8d19-34b9-4768-819a-ef867988aa7b" />

Likewise, the agent is capable of invoking tools that require specific input parameters.

<img width="1547" height="388" alt="image" src="https://github.com/user-attachments/assets/0db61bd4-a386-4e1c-92fb-23db2344ead6" />

Provided it is within the scope of the server's programmed tools, it significantly enhances the dynamic information exchange between the agent and the systems accessed via the MCP server.

<img width="1558" height="498" alt="image" src="https://github.com/user-attachments/assets/3c787d3e-8df7-46d2-9bdc-84be8f992965" />

Apply these principles to your own MuleSoft MCP server to build your own custom integrations. Simply swap out the JSON Placeholder API for any service you need, making sure to adjust the configuration for the specific API you are implementing

