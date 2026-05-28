import { Client } from '@elastic/elasticsearch';
import { config } from 'dotenv';

config();

async function check() {
  const client = new Client({
    node: process.env.ELASTIC_NODE as string,
    auth: {
      apiKey: process.env.ELASTIC_API_KEY as string
    }
  });

  try {
    const result = await client.search({
      index: 'issues',
      size: 100,
      query: { match_all: {} }
    });
    console.log(`Found ${result.hits.hits.length} issues in total.`);
    
    const unsolved = await client.search({
      index: 'issues',
      size: 100,
      query: { match: { status: 'unsolved' } }
    });
    console.log(`Found ${unsolved.hits.hits.length} UNSOLVED issues.`);
    
    // print the unsolved ones
    unsolved.hits.hits.forEach((h: any) => {
      console.log(`ID: ${h._id}, Title: ${h._source.title}, Status: ${h._source.status}, IID: ${h._source.iid}, Path: ${h._source.projectPath}`);
    });
    
  } catch (e) {
    console.error(e);
  }
}

check();
