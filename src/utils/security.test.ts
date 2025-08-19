import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sanitizeString,
  validatePageName,
  validateUUID,
  validateBlockContent,
  validateDataScriptQuery,
  validatePropertyKey,
  validateSearchQuery,
  checkRateLimit,
  validateApiToken,
  sanitizeErrorMessage,
  validateConfig,
} from './security.js';
import { ValidationError } from '../errors/index.js';

describe('Security utilities', () => {
  describe('sanitizeString', () => {
    it('should sanitize HTML characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeString(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should trim whitespace', () => {
      const input = '  hello world  ';
      const result = sanitizeString(input);
      expect(result).toBe('hello world');
    });

    it('should throw error for non-string input', () => {
      expect(() => sanitizeString(123 as any)).toThrow(ValidationError);
    });

    it('should throw error for input exceeding max length', () => {
      const longInput = 'a'.repeat(100);
      expect(() => sanitizeString(longInput, 50)).toThrow(ValidationError);
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle special characters', () => {
      const input = `Test & "quotes" & 'apostrophes'`;
      const result = sanitizeString(input);
      expect(result).toBe('Test &amp; &quot;quotes&quot; &amp; &#39;apostrophes&#39;');
    });
  });

  describe('validatePageName', () => {
    it('should validate normal page names', () => {
      expect(validatePageName('My Page')).toBe('My Page');
      expect(validatePageName('Page-123')).toBe('Page-123');
      expect(validatePageName('Page_with_underscores')).toBe('Page_with_underscores');
    });

    it('should reject invalid characters', () => {
      expect(() => validatePageName('page<test')).toThrow(ValidationError);
      expect(() => validatePageName('page>test')).toThrow(ValidationError);
      expect(() => validatePageName('page:test')).toThrow(ValidationError);
      expect(() => validatePageName('page/test')).toThrow(ValidationError);
      expect(() => validatePageName('page\\test')).toThrow(ValidationError);
      expect(() => validatePageName('page|test')).toThrow(ValidationError);
      expect(() => validatePageName('page?test')).toThrow(ValidationError);
      expect(() => validatePageName('page*test')).toThrow(ValidationError);
    });

    it('should reject reserved names', () => {
      expect(() => validatePageName('CON')).toThrow(ValidationError);
      expect(() => validatePageName('con')).toThrow(ValidationError);
      expect(() => validatePageName('PRN')).toThrow(ValidationError);
      expect(() => validatePageName('COM1')).toThrow(ValidationError);
    });

    it('should reject empty names', () => {
      expect(() => validatePageName('')).toThrow(ValidationError);
      expect(() => validatePageName('   ')).toThrow(ValidationError);
    });
  });

  describe('validateUUID', () => {
    it('should validate correct UUIDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(validateUUID(uuid)).toBe(uuid);
    });

    it('should convert to lowercase', () => {
      const uuid = '550E8400-E29B-41D4-A716-446655440000';
      expect(validateUUID(uuid)).toBe(uuid.toLowerCase());
    });

    it('should reject invalid UUIDs', () => {
      expect(() => validateUUID('invalid-uuid')).toThrow(ValidationError);
      expect(() => validateUUID('550e8400-e29b-41d4-a716')).toThrow(ValidationError);
      expect(() => validateUUID('550e8400-e29b-41d4-a716-44665544000')).toThrow(ValidationError);
      expect(() => validateUUID('')).toThrow(ValidationError);
    });
  });

  describe('validateBlockContent', () => {
    it('should validate normal content', () => {
      const content = 'This is normal block content with **markdown**.';
      expect(validateBlockContent(content)).toBe(content);
    });

    it('should reject script content', () => {
      expect(() => validateBlockContent('<script>alert("xss")</script>')).toThrow(ValidationError);
      expect(() => validateBlockContent('javascript:void(0)')).toThrow(ValidationError);
      expect(() => validateBlockContent('data:text/html,<script>alert(1)</script>')).toThrow(
        ValidationError
      );
    });

    it('should handle long content', () => {
      const longContent = 'a'.repeat(1000);
      expect(validateBlockContent(longContent)).toBe(longContent);
    });

    it('should reject extremely long content', () => {
      const tooLongContent = 'a'.repeat(100000);
      expect(() => validateBlockContent(tooLongContent)).toThrow(ValidationError);
    });
  });

  describe('validateDataScriptQuery', () => {
    it('should validate correct DataScript queries', () => {
      const query = '[:find ?b :where [?b :block/content ?content]]';
      expect(validateDataScriptQuery(query)).toBe(query);
    });

    it('should reject queries without :find', () => {
      const query = '[?b :where [?b :block/content ?content]]';
      expect(() => validateDataScriptQuery(query)).toThrow(ValidationError);
    });

    it('should reject queries not starting with [', () => {
      const query = ':find ?b :where [?b :block/content ?content]';
      expect(() => validateDataScriptQuery(query)).toThrow(ValidationError);
    });

    it('should reject dangerous patterns', () => {
      expect(() => validateDataScriptQuery('[:find ?b :where eval(malicious)]')).toThrow(
        ValidationError
      );
      expect(() => validateDataScriptQuery('[:find ?b :where function(attack)]')).toThrow(
        ValidationError
      );
      expect(() => validateDataScriptQuery('[:find ?b :where ${injection}]')).toThrow(
        ValidationError
      );
      expect(() => validateDataScriptQuery('[:find ?b :where javascript:attack]')).toThrow(
        ValidationError
      );
      expect(() => validateDataScriptQuery('[:find ?b :where <script>]')).toThrow(ValidationError);
    });
  });

  describe('validatePropertyKey', () => {
    it('should validate correct property keys', () => {
      expect(validatePropertyKey('propertyName')).toBe('propertyName');
      expect(validatePropertyKey('property_name')).toBe('property_name');
      expect(validatePropertyKey('property-name')).toBe('property-name');
      expect(validatePropertyKey('property123')).toBe('property123');
    });

    it('should reject invalid property keys', () => {
      expect(() => validatePropertyKey('123property')).toThrow(ValidationError);
      expect(() => validatePropertyKey('property name')).toThrow(ValidationError);
      expect(() => validatePropertyKey('property.name')).toThrow(ValidationError);
      expect(() => validatePropertyKey('property@name')).toThrow(ValidationError);
    });

    it('should reject empty property keys', () => {
      expect(() => validatePropertyKey('')).toThrow(ValidationError);
    });
  });

  describe('validateSearchQuery', () => {
    it('should validate normal search queries', () => {
      expect(validateSearchQuery('search term')).toBe('search term');
      expect(validateSearchQuery('single')).toBe('single');
    });

    it('should allow quoted strings with special characters', () => {
      expect(validateSearchQuery('"search with [special] characters"')).toBe(
        '"search with [special] characters"'
      );
    });

    it('should reject unquoted regex characters', () => {
      expect(() => validateSearchQuery('search[term]')).toThrow(ValidationError);
      expect(() => validateSearchQuery('search*')).toThrow(ValidationError);
      expect(() => validateSearchQuery('search+')).toThrow(ValidationError);
    });

    it('should reject empty queries', () => {
      expect(() => validateSearchQuery('')).toThrow(ValidationError);
      expect(() => validateSearchQuery('   ')).toThrow(ValidationError);
    });
  });

  describe('checkRateLimit', () => {
    beforeEach(() => {
      // Clear rate limit store between tests
      // Note: In real implementation, you'd want to expose a way to clear this
    });

    it('should allow requests within limit', () => {
      const result1 = checkRateLimit('client1', 5, 60000);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);

      const result2 = checkRateLimit('client1', 5, 60000);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    it('should deny requests exceeding limit', () => {
      // Use up the limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit('client2', 5, 60000);
      }

      const result = checkRateLimit('client2', 5, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different clients separately', () => {
      checkRateLimit('client3', 2, 60000);
      checkRateLimit('client3', 2, 60000);

      const result3 = checkRateLimit('client3', 2, 60000);
      expect(result3.allowed).toBe(false);

      const result4 = checkRateLimit('client4', 2, 60000);
      expect(result4.allowed).toBe(true);
    });
  });

  describe('validateApiToken', () => {
    it('should validate correct tokens', () => {
      expect(validateApiToken('abcd1234-efgh-5678')).toBe(true);
      expect(validateApiToken('token_with_underscores')).toBe(true);
      expect(validateApiToken('token.with.dots')).toBe(true);
      expect(validateApiToken('a'.repeat(32))).toBe(true);
    });

    it('should reject invalid tokens', () => {
      expect(validateApiToken('token with spaces')).toBe(false);
      expect(validateApiToken('token@invalid')).toBe(false);
      expect(validateApiToken('short')).toBe(false);
      expect(validateApiToken('')).toBe(false);
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should remove file paths', () => {
      const error = new Error('Error in /home/user/project/file.js');
      const result = sanitizeErrorMessage(error);
      expect(result).toBe('Error in [PATH]');
    });

    it('should remove IP addresses', () => {
      const error = new Error('Connection failed to 192.168.1.1');
      const result = sanitizeErrorMessage(error);
      expect(result).toBe('Connection failed to [IP]');
    });

    it('should remove email addresses', () => {
      const error = new Error('User user@example.com not found');
      const result = sanitizeErrorMessage(error);
      expect(result).toBe('User [EMAIL] not found');
    });

    it('should remove potential hashes', () => {
      const error = new Error('Token abc123def456 is invalid');
      const result = sanitizeErrorMessage(error);
      expect(result).toBe('Token [HASH] is invalid');
    });

    it('should handle non-Error objects', () => {
      const result = sanitizeErrorMessage('some error string');
      expect(result).toBe('An error occurred');
    });
  });

  describe('validateConfig', () => {
    it('should validate secure configurations', () => {
      const config = {
        apiUrl: 'https://localhost:12315',
        debug: false,
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should reject insecure HTTP URLs in production', () => {
      const config = {
        apiUrl: 'http://example.com:12315',
      };
      expect(() => validateConfig(config)).toThrow(ValidationError);
    });

    it('should allow HTTP for localhost', () => {
      const configs = [{ apiUrl: 'http://localhost:12315' }, { apiUrl: 'http://127.0.0.1:12315' }];

      configs.forEach((config) => {
        expect(() => validateConfig(config)).not.toThrow();
      });
    });

    it('should warn about debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const config = { debug: true };
      validateConfig(config);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Debug mode is enabled - ensure this is intentional for production'
      );

      consoleSpy.mockRestore();
    });
  });
});
