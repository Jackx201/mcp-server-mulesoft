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
       <mcp:text-tool-response-content text="#[payload.^raw)]" />
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
   <mcp:text-tool-response-content text="#[payload.^raw)]" />
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
   <mcp:text-tool-response-content text="#[payload.^raw]" />
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


# Demo.

Una vez desplegado y conectado tu servidor MCP a tu agente.

<img width="1335" height="426" alt="image" src="https://github.com/user-attachments/assets/c3d10799-a061-421d-a53a-fa7a48579b45" />


Puedes preguntarle a tu agente que te de una lista de todos los usuarios de JSON Placeholder. Al ser una API pública es posible que quiera hacer fetch directo, de ser ese el caso puedes especificar que use la herramienta get-users programada en nuestro servidor MCP local.


<img width="1539" height="448" alt="image" src="https://github.com/user-attachments/assets/03bc8c6d-0b54-4249-bb9a-05cbbebe19d3" />

Al permitirle correr la herramienta, debería regresarte la lista de usuarios:

<img width="1560" height="652" alt="image" src="https://github.com/user-attachments/assets/2c790092-66ef-411b-9938-aaef003c83d2" />

Los datos que te de el agente en su respuesta dependrá enteramente del prompt que le proporciones. Puedes ver el resultado completo al dar click en el diálogo donde ejecutó la herramienta. Donde encontrarás la respuesta en crudo con todos los datos que obtuvo el agente al consumir tu herramienta.

<img width="1540" height="1051" alt="image" src="https://github.com/user-attachments/assets/0e07bb49-c84a-4d07-ab2a-20f476a096f2" />

De igual forma el agente puede ejecutar herramientas con parámetros de entrada.

<img width="1559" height="504" alt="image" src="https://github.com/user-attachments/assets/3a3f7a2e-3043-43cf-a7fd-44c449fa8b94" />

Siempre y cuando esté dentro del alcance de las herramientas programadas dentro del servidor. Ampliando enormemente el intercambio dinámico de información entre el agente y los sistemas que consuma mediante el servidor MCP.

<img width="1574" height="750" alt="image" src="https://github.com/user-attachments/assets/63ead2bf-72e6-4828-a606-380abc96b2df" />

Aplica estos principios en tu propio servidor MCP de Mulesoft y desarrolla integraciones a tu gusto y necesidades. Es tan sencillo como reemplazar la API de JSON Placeholder con la API o servicio que necesites, siempre y cuando hagas los ajustes necesarios dependiendo de la API que vayas a implementar.

