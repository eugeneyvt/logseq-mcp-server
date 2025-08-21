import type { LogseqClient } from '../../logseq-client.js';

/**
 * Execute property-related search operations
 * This module only handles property-based searches and property discovery
 */
export async function executePropertySearch(
  client: LogseqClient,
  query: string
): Promise<Array<Record<string, unknown>>> {
  if (query.startsWith('property:') && query.includes('=')) {
    return await executePropertyBasedSearch(client, query);
  }

  if (query === 'properties:*' || query === 'properties:all') {
    return await executeAllPropertiesSearch(client);
  }

  if (query.startsWith('properties:page=')) {
    return await executePagePropertiesSearch(client, query);
  }

  return [];
}

/**
 * Execute property-based search (property:key=value)
 */
async function executePropertyBasedSearch(
  client: LogseqClient,
  query: string
): Promise<Array<Record<string, unknown>>> {
  const match = query.match(/^property:([^=]+)=(.+)$/);
  if (!match) {
    return [];
  }

  const [, key, value] = match;
  const allPages = await client.getAllPages();
  if (!allPages || !Array.isArray(allPages)) {
    return [];
  }

  const matchingPages = allPages.filter((page) => {
    if (!page.properties) {
      return false;
    }
    const propValue = page.properties[key];
    if (propValue === undefined) {
      return false;
    }

    // Support different comparison types
    const normalizedValue = value.toLowerCase();
    const normalizedPropValue = String(propValue).toLowerCase();

    return normalizedPropValue === normalizedValue || normalizedPropValue.includes(normalizedValue);
  });

  return matchingPages.map((page) => ({
    type: 'page',
    id: page.id,
    name: page.name,
    properties: page.properties || {},
    matchedProperty: { [key]: page.properties?.[key] },
  }));
}

/**
 * Execute search for all pages that have properties
 */
async function executeAllPropertiesSearch(
  client: LogseqClient
): Promise<Array<Record<string, unknown>>> {
  const allPages = await client.getAllPages();
  return allPages
    .filter((page) => page.properties && Object.keys(page.properties).length > 0)
    .map((page) => ({
      type: 'properties',
      id: page.id,
      name: page.name,
      properties: page.properties || {},
      propertyCount: Object.keys(page.properties || {}).length,
      propertyList: Object.entries(page.properties || {}).map(([key, value]) => ({
        key,
        value,
      })),
    }));
}

/**
 * Execute search for properties of a specific page
 */
async function executePagePropertiesSearch(
  client: LogseqClient,
  query: string
): Promise<Array<Record<string, unknown>>> {
  const match = query.match(/^properties:page=(?:"([^"]+)"|(.+))$/);
  if (!match) {
    return [];
  }

  const pageName = match[1] || match[2];
  const allPages = await client.getAllPages();

  if (pageName === '*' || pageName === 'all') {
    // Return all pages that have properties
    return executeAllPropertiesSearch(client);
  }

  // Return specific page properties
  const targetPage = allPages.find(
    (p) =>
      p.name.toLowerCase() === pageName.toLowerCase() ||
      p.originalName?.toLowerCase() === pageName.toLowerCase()
  );

  if (targetPage && targetPage.properties) {
    return [
      {
        type: 'properties',
        id: targetPage.id,
        name: targetPage.name,
        properties: targetPage.properties,
        propertyCount: Object.keys(targetPage.properties).length,
        propertyList: Object.entries(targetPage.properties).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ];
  } else if (targetPage) {
    return [
      {
        type: 'properties',
        id: targetPage.id,
        name: targetPage.name,
        properties: {},
        propertyCount: 0,
        propertyList: [],
      },
    ];
  }

  return [];
}
