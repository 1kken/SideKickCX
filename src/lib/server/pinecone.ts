import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from 'langchain/document';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';

// Environment variables
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || '';
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || '';

if (!PINECONE_API_KEY || !PINECONE_ENVIRONMENT || !PINECONE_INDEX_NAME) {
  console.error('Missing Pinecone environment variables');
}

// Initialize the Pinecone client
export const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
  environment: PINECONE_ENVIRONMENT,
});

/**
 * Initialize the Pinecone index
 */
export const initPinecone = async () => {
  try {
    const indexesList = await pinecone.listIndexes();
    const indexExists = indexesList.some(index => index.name === PINECONE_INDEX_NAME);

    if (!indexExists) {
      console.log(`Creating index: ${PINECONE_INDEX_NAME}`);
      // Create the index if it doesn't exist
      await pinecone.createIndex({
        name: PINECONE_INDEX_NAME,
        dimension: 1536, // OpenAI embeddings dimension
        metric: 'cosine',
      });
      console.log(`Index created: ${PINECONE_INDEX_NAME}`);
    } else {
      console.log(`Index already exists: ${PINECONE_INDEX_NAME}`);
    }

    // Connect to the index
    const index = pinecone.index(PINECONE_INDEX_NAME);
    return index;
  } catch (error) {
    console.error('Error initializing Pinecone:', error);
    throw error;
  }
};

/**
 * Add documents to the Pinecone index
 */
export const addDocuments = async (documents: Document[], namespace?: string) => {
  try {
    const index = await initPinecone();
    const embeddings = new OpenAIEmbeddings();
    
    await PineconeStore.fromDocuments(
      documents,
      embeddings,
      {
        pineconeIndex: index,
        namespace: namespace,
      }
    );
    
    console.log(`Added ${documents.length} documents to Pinecone`);
    return true;
  } catch (error) {
    console.error('Error adding documents to Pinecone:', error);
    throw error;
  }
};

/**
 * Query the Pinecone index
 */
export const queryPinecone = async (query: string, namespace?: string, topK: number = 5) => {
  try {
    const index = await initPinecone();
    const embeddings = new OpenAIEmbeddings();
    
    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      {
        pineconeIndex: index,
        namespace: namespace,
      }
    );
    
    const results = await vectorStore.similaritySearch(query, topK);
    return results;
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    throw error;
  }
};

/**
 * Delete documents from Pinecone index
 */
export const deleteDocuments = async (ids: string[], namespace?: string) => {
  try {
    const index = await initPinecone();
    await index.namespace(namespace || '').deleteMany(ids);
    console.log(`Deleted ${ids.length} documents from Pinecone`);
    return true;
  } catch (error) {
    console.error('Error deleting documents from Pinecone:', error);
    throw error;
  }
};

/**
 * Delete everything in a namespace
 */
export const deleteNamespace = async (namespace: string) => {
  try {
    const index = await initPinecone();
    await index.namespace(namespace).deleteAll();
    console.log(`Deleted all documents in namespace: ${namespace}`);
    return true;
  } catch (error) {
    console.error(`Error deleting namespace ${namespace}:`, error);
    throw error;
  }
}; 