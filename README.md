# MCP Server MuleSoft - Proyecto de Aprendizaje


Este es un servidor MCP (Model Context Protocol) de prueba creado con MuleSoft para entender cómo configurar y desarrollar servidores MCP que puedan ser consumidos por clientes de IA como Claude.


## ¿Qué es MCP?


MCP (Model Context Protocol) es un protocolo desarrollado por Anthropic que permite que aplicaciones de IA interactúen con diferentes fuentes de datos y herramientas de manera estandarizada. Un servidor MCP expone "herramientas" que los modelos de IA pueden descubrir y usar.


## Arquitectura del Servidor


```
Cliente MCP (Claude Desktop / Inspector)
   ↓ SSE (Server-Sent Events)
Servidor MCP (MuleSoft - localhost:8080)
   ↓ Tool Listeners (4 herramientas)
Flows de MuleSoft
   ↓ HTTP Requests
JSONPlaceholder API (https://jsonplaceholder.typicode.com)
```


## Herramientas Disponibles


Este servidor expone 4 herramientas que interactúan con la API pública JSONPlaceholder:


### 1. get-all-posts
- **Descripción**: Obtiene todos los posts del blog
- **Parámetros**: Ninguno
- **Respuesta**: Lista de 100 posts con título, cuerpo y userId


### 2. get-post-by-id
- **Descripción**: Obtiene un post específico por su ID
- **Parámetros**:
 - `postId` (integer, 1-100): ID del post a obtener
- **Respuesta**: Post individual con todos sus detalles


### 3. get-users
- **Descripción**: Obtiene la lista de todos los usuarios
- **Parámetros**: Ninguno
- **Respuesta**: Lista de usuarios con nombre, email y ciudad


### 4. get-user-posts
- **Descripción**: Obtiene todos los posts de un usuario específico
- **Parámetros**:
 - `userId` (integer): ID del usuario
- **Respuesta**: Lista de posts del usuario especificado


## Requisitos Previos


- Java 17
- Maven 3.x
- MuleSoft Runtime 4.9.6 o superior
- Anypoint Studio (opcional, para desarrollo visual)


## Configuración y Ejecución


### 1. Clonar o descargar el proyecto


```bash
cd mcp-server-mulesoft
```


### 2. Ejecutar el servidor


**Opción A: Con Maven**
```bash
mvn clean install
mvn mule:run
```


**Opción B: Con Anypoint Studio**
1. Importar el proyecto en Anypoint Studio
2. Click derecho en el proyecto → Run As → Mule Application
3. Añade este argumento a tu configuración de ejecución del projecto: -M-Dmule.http.service.implementation=NETTY


### 3. Verificar que el servidor está corriendo


```bash
curl http://localhost:8080/api/sse
```


El comando debería mantener la conexión abierta (presiona Ctrl+C para salir).


## Probar con MCP Inspector


El MCP Inspector es una herramienta visual para debuggear y probar servidores MCP.


### Ejecutar el Inspector


```bash
npx @modelcontextprotocol/inspector http://localhost:8080/sse
```


Esto abrirá automáticamente tu navegador con una interfaz donde podrás:
- Ver las 4 herramientas disponibles
- Probar cada herramienta con inputs interactivos
- Ver los mensajes JSON-RPC en tiempo real
- Debuggear errores y respuestas


### Si el puerto está en uso


```bash
# Matar el proceso anterior
kill $(lsof -ti:6274)


# O usar un puerto diferente
PORT=6275 npx @modelcontextprotocol/inspector http://localhost:8080/sse
```


## Probar con cURL


También puedes probar manualmente con cURL:

Para probar manualmente con cURL se recomienda cambiar a sse en lugar de http streamable.
De probar con sse:

```bash
# 1. Crear una sesión
curl http://localhost:8080/api/sse

//Esta llamada te dará un SESSION_ID, usalo en las posteriores requests



# 2. Inicializar la sesión MCP
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


# 2.1 Notifica la sesión MCP iniciada

 curl -X POST "http://localhost:8080/message?sessionId=${SESSION_ID}" \
 -H "Content-Type: application/json" \
 -d '{
   "jsonrpc": "2.0",
   "method": "notifications/initialized",
   "id": 1
 }'


# 3. Llamar una herramienta (ejemplo: get-users)
curl -X POST "http://localhost:8080/api/message?sessionId=${SESSION_ID}" \
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


## Integrar con tu Agente Copilot


Para usar este servidor desde Copilot.


1. Agrega la configuración del servidor en la carpeta .vscode crea el archivo mcp.json
  ```json

    {
        "servers": {
            "{{Nombre-Del-Servisor}}": {
                "url": "http://localhost:8080/mcp",
                "type": "http"
            }
        },
        "inputs": []
    }

  ```


2. Asegurate que tu chatbot tenga habilitados los servidores MCP. (Revisar configuración en el icono del engranaje.)

3. Abre el ícono de herramientas en tu chatbot.

4. Deberías ver las 4 herramientas disponibles en tu copiloto.


## Conceptos Clave Aprendidos


### 1. Configuración del Servidor MCP


```xml
<mcp:server-config name="Server" serverName="mule-mcp-server" serverVersion="1.0.0">
   <mcp:streamable-http-server-connection listenerConfig="HTTP-Listener-config"/>
</mcp:server-config>
```


### 2. Definición de una Herramienta


```xml
<mcp:tool-listener name="nombre-herramienta" config-ref="Server">
   <mcp:description>Descripción de qué hace</mcp:description>
   <mcp:parameters-schema><![CDATA[{
       "$schema": "http://json-schema.org/draft-07/schema#",
       "type": "object",
       "properties": {
           "param1": {
               "type": "string",
               "description": "Descripción del parámetro"
           }
       },
       "required": ["param1"]
   }]]></mcp:parameters-schema>
   <mcp:responses>
       <mcp:text-tool-response-content text="#[write(payload, 'application/json')]" />
   </mcp:responses>
</mcp:tool-listener>
```


### 3. Acceso a Parámetros


Los parámetros enviados por el cliente MCP están disponibles en el `payload`:


```xml
<set-variable variableName="userId" value="#[payload.userId]" />
```


### 4. Formato de Respuesta


Es crítico configurar `<mcp:responses>` con `<mcp:text-tool-response-content>`:


```xml
<mcp:responses>
   <mcp:text-tool-response-content text="#[write(payload, 'application/json')]" />
</mcp:responses>
```


### 5. Flujo de Comunicación MCP SSE


1. Cliente conecta vía SSE: `GET /api/sse`
2. Handshake: `initialize` request
3. Descubrimiento: `tools/list` request
4. Ejecución: `tools/call` con parámetros
5. Respuesta: Servidor devuelve resultado en formato MCP


## Estructura del Proyecto


```
mcp-server-mulesoft/
├── pom.xml                           # Configuración Maven
├── mule-artifact.json                # Metadata de la aplicación Mule
├── src/
│   └── main/
│       ├── mule/
│       │   └── mcp-server-mulesoft.xml   # Configuración de flows y herramientas
│       └── resources/
│           └── log4j2.xml            # Configuración de logging
└── README.md                         # Este archivo
```


## Troubleshooting


### Error: "content: []" vacío en respuestas


**Causa**: `<mcp:responses>` no está configurado correctamente.


**Solución**: Asegúrate de que todas las herramientas tengan:
```xml
<mcp:responses>
   <mcp:text-tool-response-content text="#[write(payload, 'application/json')]" />
</mcp:responses>
```


### Error SSL/TLS al conectar con APIs externas


**Causa**: El JVM no confía en el certificado de la API externa.


**Solución**: Para desarrollo, usa:
```xml
<tls:context>
   <tls:trust-store insecure="true"/>
</tls:context>
```


**Nota**: En producción, agrega los certificados al truststore de Java.


### Error: "Invalid input" en inputSchema


**Causa**: Falta el campo `$schema` en el JSON Schema.


**Solución**: Todas las herramientas deben incluir:
```json
{
   "$schema": "http://json-schema.org/draft-07/schema#",
   "type": "object",
   ...
}
```


### Puerto 6274 en uso al ejecutar Inspector


**Causa**: Ya hay una instancia del Inspector corriendo.


**Solución**:
- Detener el proceso usando Ctrl+C en la terminal donde se ejecutó el comando.
- De no tener la terminal a la mano puedes hacer:
```bash
kill $(lsof -ti:6274)
# O usar otro puerto
PORT=6275 npx @modelcontextprotocol/inspector http://localhost:8080/api/sse
```


## Recursos Adicionales


- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MuleSoft MCP Connector Documentation](https://docs.mulesoft.com/)
- [JSONPlaceholder API](https://jsonplaceholder.typicode.com/)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)


## Licencia


Este es un proyecto educativo de código abierto. Siéntete libre de usar, modificar y distribuir.

