import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeHeaderHash, inferColumnMapping, clearMockCache, getCachedMapping, injectMockCache } from './extractor';
import * as geminiClient from './geminiClient';
import * as groqClient from './groqClient';
import { MappingResult } from '@groweasy/shared-types';

vi.mock('./geminiClient', () => ({
  getGeminiModel: vi.fn(),
  mappingResponseSchema: {}
}));

vi.mock('./groqClient', () => ({
  generateGroqJson: vi.fn()
}));

vi.mock('../../db/pool', () => ({
  query: vi.fn(),
  isDbConnected: vi.fn().mockReturnValue(false),
  getPool: vi.fn().mockReturnValue(null)
}));

describe('AI Extractor - Stage 1 (Column Mapping)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockCache();
  });

  describe('computeHeaderHash', () => {
    it('should be case-sensitive and sort-independent', () => {
      const headersA = ['First Name', 'Last Name', 'Email'];
      const headersB = ['Email', 'Last Name', 'First Name'];
      const headersC = ['first name', 'last name', 'email'];

      const hashA = computeHeaderHash(headersA);
      const hashB = computeHeaderHash(headersB);
      const hashC = computeHeaderHash(headersC);

      expect(hashA).toBe(hashB); // Order-independent
      expect(hashA).not.toBe(hashC); // Case-sensitive
    });
  });

  describe('inferColumnMapping Caching', () => {
    it('should return cached mapping and not call AI if cache hit', async () => {
      const headers = ['Name', 'Email'];
      const hash = computeHeaderHash(headers);
      const mockMapping: MappingResult = {
        mapping: [
          { sourceColumn: 'Name', targetField: 'name', confidence: 0.95 },
          { sourceColumn: 'Email', targetField: 'email', confidence: 0.99 }
        ],
        unmappedColumns: []
      };

      injectMockCache(hash, mockMapping);

      const result = await inferColumnMapping(headers, []);
      expect(result).toEqual(mockMapping);
      expect(geminiClient.getGeminiModel).not.toHaveBeenCalled();
      expect(groqClient.generateGroqJson).not.toHaveBeenCalled();
    });
  });

  describe('inferColumnMapping Retry & Fallback Flow', () => {
    const headers = ['Name', 'Email'];
    const sampleRows = [{ 'Name': 'Alice', 'Email': 'alice@example.com' }];
    const expectedMapping: MappingResult = {
      mapping: [
        { sourceColumn: 'Name', targetField: 'name', confidence: 0.9 },
        { sourceColumn: 'Email', targetField: 'email', confidence: 0.95 }
      ],
      unmappedColumns: []
    };

    it('should succeed on first Gemini attempt', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify(expectedMapping)
        }
      });
      vi.mocked(geminiClient.getGeminiModel).mockReturnValue({
        generateContent: mockGenerateContent
      } as any);

      const result = await inferColumnMapping(headers, sampleRows);
      expect(result).toEqual(expectedMapping);
      expect(geminiClient.getGeminiModel).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      
      // Verify cached
      const hash = computeHeaderHash(headers);
      const cached = await getCachedMapping(hash);
      expect(cached).toEqual(expectedMapping);
    });

    it('should retry Gemini once on failure, then succeed', async () => {
      const mockGenerateContent = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(expectedMapping)
          }
        });

      vi.mocked(geminiClient.getGeminiModel).mockReturnValue({
        generateContent: mockGenerateContent
      } as any);

      const result = await inferColumnMapping(headers, sampleRows);
      expect(result).toEqual(expectedMapping);
      expect(geminiClient.getGeminiModel).toHaveBeenCalledTimes(2);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('should fall back to Groq if Gemini fails twice', async () => {
      // Gemini fails twice
      const mockGenerateContent = vi.fn().mockRejectedValue(new Error('Rate limit exceeded'));
      vi.mocked(geminiClient.getGeminiModel).mockReturnValue({
        generateContent: mockGenerateContent
      } as any);

      // Groq succeeds
      vi.mocked(groqClient.generateGroqJson).mockResolvedValue(JSON.stringify(expectedMapping));

      const result = await inferColumnMapping(headers, sampleRows);
      expect(result).toEqual(expectedMapping);
      expect(geminiClient.getGeminiModel).toHaveBeenCalledTimes(2);
      expect(groqClient.generateGroqJson).toHaveBeenCalledTimes(1);
    });
  });
});
