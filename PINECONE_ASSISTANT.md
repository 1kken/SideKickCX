# Pinecone Assistant Integration

This integration allows you to interact with Pinecone Assistant API from your SvelteKit application.

## Setup

1. **Set your Pinecone API key** in a `.env` file at the root of your project:

```
PINECONE_API_KEY=your-pinecone-api-key
```

2. **Create a Pinecone Assistant** in the Pinecone Console if you haven't already.

## Features

- Upload files to your Pinecone Assistant
- Chat with your assistant using the Pinecone API
- Support for streaming responses (optional)

## API Endpoints

### Chat with Pinecone Assistant

```
POST /api/pinecone/chat
```

Request body:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "What is the inciting incident of Pride and Prejudice?"
    }
  ],
  "stream": false,
  "model": "gpt-4o",
  "assistantId": "sidekickcx" // optional, defaults to "sidekickcx"
}
```

### Upload File to Pinecone Assistant

```
POST /api/pinecone/upload
```

Request body (form data):
- `file`: The file to upload
- `assistantId`: (optional) The ID of your assistant, defaults to "sidekickcx"

## Example Usage with cURL

### Chat with Assistant

```bash
curl "http://localhost:5173/api/pinecone/chat" \
  -H "Content-Type: application/json" \
  -d '{
  "messages": [
    {
      "role": "user",
      "content": "What is the inciting incident of Pride and Prejudice?"
    }
  ],
  "stream": false,
  "model": "gpt-4o"
  }'
```

### Upload File to Assistant

```bash
curl "http://localhost:5173/api/pinecone/upload" \
  -F "file=@/path/to/your/file.txt"
```

## Direct Pinecone API Usage

You can also use the Pinecone API directly:

### Upload a File

```bash
PINECONE_API_KEY="YOUR_API_KEY"
LOCAL_FILE_PATH="/path/to/your/file.txt"

curl -X POST \
  "https://prod-1-data.ke.pinecone.io/assistant/files/sidekickcx" \
  -H "Api-Key: $PINECONE_API_KEY" \
  -F "file=@$LOCAL_FILE_PATH"
```

### Chat with Assistant

```bash
PINECONE_API_KEY="YOUR_API_KEY"

curl "https://prod-1-data.ke.pinecone.io/assistant/chat/sidekickcx" \
  -H "Api-Key: $PINECONE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "messages": [
    {
      "role": "user",
      "content": "What is the inciting incident of Pride and Prejudice?"
    }
  ],
  "stream": false,
  "model": "gpt-4o"
  }'
```

## Web Interface

A simple web interface is available at `/pinecone` to test the integration. 