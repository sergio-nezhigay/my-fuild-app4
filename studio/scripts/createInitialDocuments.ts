import {getCliClient} from 'sanity/cli';
import {SINGLETONS} from '../structure/singletons';
import fs from 'fs';
import {initialSingletonsValues} from './initialSingletonsValues';
import {initialDocumentsValues} from './initialDocumentsValues';

type JsonCache = {
  projectId: string;
  description: string;
};

/**
 * This script will create one or many "singleton" documents for each language
 * It works by appending the language ID to the document ID
 * and creating the translations.metadata document
 *
 * 1. Take a backup of your dataset with:
 * `npx sanity@latest dataset export`
 *
 * 2. Copy this file to the root of your Sanity Studio project
 *
 * 3. Update the SINGLETONS and LANGUAGES constants to your needs
 *
 * 4. Run the script (replace <schema-type> with the name of your schema type):
 * npx sanity@latest exec ./createSingletons.ts --with-user-token
 *
 * 5. Update your desk structure to use the new documents
 */

// This will use the client configured in ./sanity.cli.ts
const client = getCliClient();
const projectId = client.config().projectId;
const JSON_FILE_PATH = './scripts/cache.json';

if (!projectId) {
  console.log('❌ Project ID not found. Exiting...');
  process.exit(0);
}

// Read the JSON file
let jsonCache: JsonCache = {
  projectId: '',
  description: '',
};

if (fs.existsSync(JSON_FILE_PATH)) {
  const data = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf8')) as JsonCache;

  if (data.projectId) {
    jsonCache = data;
  }
}

// Check if the current projectId already exists in the JSON
if (jsonCache.projectId === projectId) {
  process.exit(0);
} else {
  jsonCache.description =
    'This file is automatically generated for cache purposes';
  // Add or update the current projectId in the JSON
  jsonCache.projectId = projectId;

  // Write the updated JSON file
  fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(jsonCache, null, 2));
}

async function createSingletons() {
  const singletonsArray = Object.values(SINGLETONS);

  const singletons = singletonsArray
    .map((singleton) => {
      return [
        {
          _id: `${singleton.id}`,
          _type: singleton._type,
          ...initialSingletonsValues[
            singleton.id as keyof typeof initialSingletonsValues
          ],
        },
      ];
    })
    .flat();

  const transaction = client.transaction();

  singletons.forEach((doc: any) => {
    transaction.createIfNotExists(doc);
  });

  initialDocumentsValues.forEach((doc: any) => {
    transaction.createIfNotExists(doc);
  });

  await transaction
    .commit()
    .then((res) => {
      // eslint-disable-next-line no-console
      console.log('✔ Singletons created successfully!');
    })
    .catch((err) => {
      console.error(err);
    });
}

createSingletons();
