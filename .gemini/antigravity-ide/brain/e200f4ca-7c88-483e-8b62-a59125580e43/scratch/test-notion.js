const fs = require('fs');
const path = require('path');
const { Client } = require('c:/Users/korba/OneDrive/Documents/YoutubeDoro/node_modules/@notionhq/client');

// Read .env.local
const envPath = path.join(__dirname, '..', '..', '..', '..', 'OneDrive', 'Documents', 'YoutubeDoro', '.env.local');
console.log('Reading env from:', envPath);

let token = '';
let databaseId = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      // Remove surrounding quotes if any
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (key === 'NOTION_TOKEN') token = value;
      if (key === 'NOTION_DATABASE_ID') databaseId = value;
    }
  }
} catch (err) {
  console.error('Error reading .env.local:', err.message);
  process.exit(1);
}

console.log('Token (truncated):', token ? token.substring(0, 10) + '...' : 'not found');
console.log('Database ID:', databaseId || 'not found');

if (!token) {
  console.error('NOTION_TOKEN is missing in .env.local');
  process.exit(1);
}

const client = new Client({ auth: token });

async function test() {
  try {
    console.log('Testing connection to Notion (users.me)...');
    const me = await client.users.me({});
    console.log('Success! Connected as user:', me.name, `(${me.type})`);
    
    if (databaseId) {
      console.log('Testing connection to Database...');
      let dbName = '';
      try {
        const db = await client.databases.retrieve({ database_id: databaseId });
        dbName = db.title?.[0]?.plain_text || 'Untitled';
        console.log('Success! Retrieved database via databases.retrieve:', dbName);
      } catch (dbErr) {
        console.log('databases.retrieve failed:', dbErr.message);
        console.log('Trying dataSources.retrieve...');
        try {
          const ds = await client.dataSources.retrieve({ data_source_id: databaseId });
          dbName = ds.name || 'Untitled DataSource';
          console.log('Success! Retrieved database via dataSources.retrieve:', dbName);
        } catch (dsErr) {
          console.log('dataSources.retrieve failed:', dsErr.message);
          throw dbErr; // throw original
        }
      }
    } else {
      console.log('No NOTION_DATABASE_ID provided. Skipping database retrieval.');
    }
  } catch (error) {
    console.error('Connection failed with error:', error.message);
    if (error.body) {
      console.error('Error body:', error.body);
    }
  }
}

test();
