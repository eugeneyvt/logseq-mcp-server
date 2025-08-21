import type { LogseqClient } from '../../logseq-client.js';
import { extractTemplatePlaceholders } from './search-utils.js';

/**
 * Execute template-related search operations
 * This module only handles template discovery and specific template searches
 */
export async function executeTemplateSearch(
  client: LogseqClient,
  query: string
): Promise<Array<Record<string, unknown>>> {
  if (query === 'templates:*' || query === 'templates:all') {
    return await executeTemplateDiscovery(client);
  }

  if (query.startsWith('template:"') && query.includes('"')) {
    return await executeSpecificTemplateSearch(client, query);
  }

  return [];
}

/**
 * Execute template discovery search
 */
async function executeTemplateDiscovery(
  client: LogseqClient
): Promise<Array<Record<string, unknown>>> {
  const allPages = await client.getAllPages();
  if (!allPages || !Array.isArray(allPages)) {
    return [];
  }

  const templates = allPages.filter(
    (page) =>
      page.name.toLowerCase().includes('template') ||
      (page.properties && page.properties.template) ||
      (page.properties && page.properties['page-type'] === 'template')
  );

  return templates.map((page) => ({
    type: 'template',
    id: page.id,
    name: page.name,
    properties: page.properties || {},
    templateType: page.properties?.['template-type'] || 'page',
  }));
}

/**
 * Execute specific template search
 */
async function executeSpecificTemplateSearch(
  client: LogseqClient,
  query: string
): Promise<Array<Record<string, unknown>>> {
  const match = query.match(/^template:"([^"]+)"/);
  if (!match) {
    return [];
  }

  const templateName = match[1];
  const allPages = await client.getAllPages();
  const targetTemplate = allPages.find(
    (p) =>
      p.name.toLowerCase() === templateName.toLowerCase() ||
      (p.name.toLowerCase().includes(templateName.toLowerCase()) &&
        (p.name.toLowerCase().includes('template') ||
          (p.properties && (p.properties.template || p.properties['page-type'] === 'template'))))
  );

  if (!targetTemplate) {
    return [];
  }

  // Get template content and structure
  try {
    const blocks = await client.getPageBlocksTree(targetTemplate.name);
    return [
      {
        type: 'template',
        id: targetTemplate.id,
        name: targetTemplate.name,
        properties: targetTemplate.properties || {},
        templateType: targetTemplate.properties?.['template-type'] || 'page',
        structure: blocks || [],
        placeholders: extractTemplatePlaceholders(blocks || []),
      },
    ];
  } catch (error) {
    return [
      {
        type: 'template',
        id: targetTemplate.id,
        name: targetTemplate.name,
        properties: targetTemplate.properties || {},
        templateType: targetTemplate.properties?.['template-type'] || 'page',
      },
    ];
  }
}
