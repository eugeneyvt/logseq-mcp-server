/**
 * Properties Entity Core
 * Core data structures and utilities for property management
 */

import { logger } from '../../utils/system/logger.js';

/**
 * Property value types supported by Logseq
 */
export type PropertyValue = string | number | boolean | string[] | number[] | Date;

/**
 * Property metadata interface
 */
export interface PropertyMeta {
  key: string;
  value: PropertyValue;
  type: 'string' | 'number' | 'boolean' | 'array' | 'date';
  isSystemProperty?: boolean;
  isRequired?: boolean;
}

/**
 * Property collection for an entity
 */
export interface PropertyCollection {
  entityId: string;
  entityType: 'page' | 'block';
  properties: PropertyMeta[];
  lastModified?: number;
}

/**
 * Normalize property value to consistent type
 */
export function normalizePropertyValue(value: unknown): PropertyValue {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map(item => String(item));
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  return String(value);
}

/**
 * Validate property key format
 */
export function isValidPropertyKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Property keys should be valid identifiers
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key);
}

/**
 * Check if property is a system property
 */
export function isSystemProperty(key: string): boolean {
  const systemProps = [
    'id', 'uuid', 'created-at', 'updated-at', 
    'journal?', 'journal-day', 'file', 'format'
  ];
  return systemProps.includes(key);
}

/**
 * Extract properties from entity
 */
export function extractProperties(entity: unknown): PropertyMeta[] {
  if (!entity || !(entity as Record<string, unknown>).properties) {
    return [];
  }

  const properties: PropertyMeta[] = [];
  const props = (entity as Record<string, unknown>).properties as Record<string, unknown>;

  for (const [key, value] of Object.entries(props)) {
    if (!isValidPropertyKey(key)) {
      logger.warn({ key }, 'Invalid property key found, skipping');
      continue;
    }

    const normalizedValue = normalizePropertyValue(value);
    const type = Array.isArray(normalizedValue) ? 'array' : 
                 typeof normalizedValue as PropertyMeta['type'];

    properties.push({
      key,
      value: normalizedValue,
      type,
      isSystemProperty: isSystemProperty(key)
    });
  }

  return properties;
}

/**
 * Create property collection from entity
 */
export function createPropertyCollection(entity: Record<string, unknown>): PropertyCollection {
  const entityId = String(entity.uuid || entity.id || 'unknown');
  const entityType = 'uuid' in entity ? 'block' : 'page';

  return {
    entityId,
    entityType,
    properties: extractProperties(entity),
    lastModified: (entity['updated-at'] as number) || Date.now()
  };
}