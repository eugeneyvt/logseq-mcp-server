#!/usr/bin/env node
// Simple script to push a formatted "Server Setup Quick Guide" page via MCP and then fetch it back

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[error] Missing required env ${name}`);
    process.exit(1);
  }
  return v;
}

// Ensure required env vars are present for the MCP server
required('LOGSEQ_API_URL');
required('LOGSEQ_API_TOKEN');

const PAGE_TITLE = 'Markdown Parser Test ' + Date.now();

const CONTENT = `# Test Markdown Parser

## Headings & Paragraphs
This paragraph includes a link to [Logseq](https://logseq.com) and some inline code like \
\`npm run build\` as well as an image: ![logo](https://example.com/logo.png)

---

## Tasks
- [ ] Unchecked item
- [x] Completed item
* [ ] Alternate bullet unchecked
* **[ ]** Bold marker unchecked
* [] No-space empty checkbox

[ ] Standalone checkbox line (should become TODO)
[x] Standalone completed line (should become DONE)

## Nested Lists
- Parent item
  - Child item
  - [ ] Child task unchecked
  - [x] Child task done

## Code Block
~~~ts
function greet(name: string) {
  return 'Hello, ' + name;
}
~~~

## Blockquote
> Tip: Use \`renderMode\` = readable
> - [ ] Checkbox in a quote (should remain quoted text)

## Table
| Feature | Status |
| ------ | ------ |
| Parsing | [x] |
| Tasks | [ ] |

## Math
Inline: $E=mc^2$  
Block:
$$
\int_a^b f(x) dx
$$
`;

async function main() {
console.log('🔌 Spawning MCP server via stdio…');
const useSrc = process.env.EXAMPLES_USE_SRC === 'true' || process.env.NODE_ENV === 'development';
const command = useSrc ? 'tsx' : 'node';
const args = useSrc ? ['src/index.ts'] : ['dist/index.js'];
console.log(`ℹ️  Using ${useSrc ? 'src/index.ts (tsx)' : 'dist/index.js (node)'} — set EXAMPLES_USE_SRC=true to force src`);
const transport = new StdioClientTransport({ command, args, cwd: process.cwd() });

  const client = new Client(
    { name: 'formatting-check-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('✅ Connected to MCP server');

  // Send the create request
  const editArgs = {
    type: 'page',
    operation: 'create',
    target: PAGE_TITLE,
    content: CONTENT,
    control: {
      parseMarkdown: true,
      // Use default readable mode; adjust to 'hierarchical' or 'singleBlock' if desired
      renderMode: 'readable'
    }
  };

  console.log('📤 Sending edit.update request…');
  const editResp = await client.callTool({ name: 'edit', arguments: editArgs });
  console.log('📥 Edit response:');
  console.log(editResp.content?.[0]?.text || JSON.stringify(editResp, null, 2));

  // Fetch page structure
  console.log('🔎 Fetching page structure…');
  const getResp = await client.callTool({
    name: 'get',
    arguments: {
      type: 'page',
      target: PAGE_TITLE,
      include: { content: true, properties: true, children: true },
      format: 'tree',
      depth: 3
    }
  });

  console.log('📥 Get response:');
  console.log(getResp.content?.[0]?.text || JSON.stringify(getResp, null, 2));

  console.log('🏁 Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
