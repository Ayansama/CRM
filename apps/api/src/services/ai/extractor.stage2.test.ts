import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractBatch } from './extractor';
import * as geminiClient from './geminiClient';
import * as groqClient from './groqClient';
import { ColumnMapping } from '@groweasy/shared-types';

vi.mock('./geminiClient', () => ({
  getGeminiModel: vi.fn(),
  extractionResponseSchema: {}
}));

vi.mock('./groqClient', () => ({
  generateGroqJson: vi.fn()
}));

vi.mock('../../db/pool', () => ({
  query: vi.fn(),
  isDbConnected: vi.fn().mockReturnValue(false),
  getPool: vi.fn().mockReturnValue(null)
}));

describe('AI Extractor - Stage 2 (Batch Data Extraction)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mapping: ColumnMapping[] = [
    { sourceColumn: 'name', targetField: 'name', confidence: 1.0 },
    { sourceColumn: 'email', targetField: 'email', confidence: 1.0 }
  ];
  const rawRows = [
    { name: 'John Doe', email: 'john@doe.com' }
  ];

  const successfulExtractionResult = {
    records: [
      {
        created_at: '2024-05-01T00:00:00.000Z',
        name: 'John Doe',
        email: 'john@doe.com',
        crm_status: 'GOOD_LEAD_FOLLOW_UP',
        data_source: 'leads_on_demand'
      }
    ],
    skipped: []
  };

  it('should extract records successfully using Gemini on first attempt', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify(successfulExtractionResult)
      }
    });
    vi.mocked(geminiClient.getGeminiModel).mockReturnValue({
      generateContent: mockGenerateContent
    } as any);

    const result = await extractBatch(mapping, rawRows, 0);

    expect(result.records).toHaveLength(1);
    expect(result.records[0].data.name).toBe('John Doe');
    expect(result.records[0].data.email).toBe('john@doe.com');
    expect(result.skipped).toHaveLength(0);
    expect(geminiClient.getGeminiModel).toHaveBeenCalledTimes(1);
  });

  it('should retry Gemini once on failure, then succeed', async () => {
    const mockGenerateContent = vi.fn()
      .mockRejectedValueOnce(new Error('Rate limit'))
      .mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify(successfulExtractionResult)
        }
      });
    vi.mocked(geminiClient.getGeminiModel).mockReturnValue({
      generateContent: mockGenerateContent
    } as any);

    const result = await extractBatch(mapping, rawRows, 0);

    expect(result.records).toHaveLength(1);
    expect(geminiClient.getGeminiModel).toHaveBeenCalledTimes(2);
  });

  it('should fall back to Groq if Gemini fails twice', async () => {
    const mockGenerateContent = vi.fn().mockRejectedValue(new Error('Internal Server Error'));
    vi.mocked(geminiClient.getGeminiModel).mockReturnValue({
      generateContent: mockGenerateContent
    } as any);

    vi.mocked(groqClient.generateGroqJson).mockResolvedValue(JSON.stringify(successfulExtractionResult));

    const result = await extractBatch(mapping, rawRows, 0);

    expect(result.records).toHaveLength(1);
    expect(geminiClient.getGeminiModel).toHaveBeenCalledTimes(2);
    expect(groqClient.generateGroqJson).toHaveBeenCalledTimes(1);
  });
});
