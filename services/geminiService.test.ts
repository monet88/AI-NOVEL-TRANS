
import { testOpenAIConnection, testDeepSeekConnection } from './aiService';
import type { TranslationSettings } from '../types';
import { MatchType } from '../types';

/*
 * This test file uses Jest syntax. To run these tests, you would need to set up
 * a testing environment like Jest (https://jestjs.io/) in your project.
 *
 * Example setup steps:
 * 1. Install Jest: `npm install --save-dev jest @types/jest ts-jest`
 * 2. Create a `jest.config.js` file.
 * 3. Add a "test" script to your `package.json`: `"test": "jest"`
 * 4. Run tests with `npm test`.
 *
 * The test functions `describe`, `it`, `expect`, `beforeEach`, and `jest.fn()`
 * are globals provided by the Jest environment.
 */

// We assume a test environment where these globals are defined.
// This helps TypeScript understand the code without requiring a full Jest setup to type-check.
declare const describe: any, it: any, expect: any, beforeEach: any, jest: any;

beforeEach(() => {
    // Reset the mock before each test to ensure tests are isolated
    window.fetch = jest.fn();
});

describe('testOpenAIConnection', () => {

    it('should return an error message when the API key is invalid', async () => {
        // ARRANGE
        const mockSettings: TranslationSettings = {
            aiProvider: 'openai',
            // FIX: Added missing geminiApiKey property
            geminiApiKey: '',
            openaiApiKey: 'sk-invalid-key',
            openaiApiEndpoint: 'https://api.openai.com/v1/chat/completions',
            deepseekApiKey: '',
            deepseekApiEndpoint: '',
            glossary: [], useGlossaryAI: false, customInstructions: '',
            glossaryExtractionInstructions: '', exclusionList: '',
            // Fix: Added missing defaultMatchType
            defaultMatchType: MatchType.CaseInsensitive,
        };

        const mockErrorResponse = {
            error: {
                message: "Incorrect API key provided.",
                type: "invalid_request_error",
                code: "invalid_api_key",
            },
        };

        // Mock the fetch call to simulate a 401 Unauthorized response from the API
        (window.fetch as any).mockResolvedValue({
            ok: false,
            status: 401,
            json: () => Promise.resolve(mockErrorResponse),
        });

        // ACT
        const result = await testOpenAIConnection(mockSettings);

        // ASSERT
        // Check that the function returns the expected failure object
        expect(result).toEqual({
            success: false,
            message: 'Connection failed: Incorrect API key provided. (Code: invalid_api_key)',
        });

        // Verify that fetch was called once with the correct URL and options
        expect(window.fetch).toHaveBeenCalledTimes(1);
        expect(window.fetch).toHaveBeenCalledWith(
            mockSettings.openaiApiEndpoint,
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mockSettings.openaiApiKey}`,
                },
            })
        );
    });
});

describe('testDeepSeekConnection', () => {
    it('should return an error message when the API key is invalid', async () => {
        // ARRANGE
        const mockSettings: TranslationSettings = {
            aiProvider: 'deepseek',
            // FIX: Added missing geminiApiKey property
            geminiApiKey: '',
            openaiApiKey: '',
            openaiApiEndpoint: '',
            deepseekApiKey: 'sk-invalid-deepseek-key',
            deepseekApiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
            glossary: [], useGlossaryAI: false, customInstructions: '',
            glossaryExtractionInstructions: '', exclusionList: '',
            // Fix: Added missing defaultMatchType
            defaultMatchType: MatchType.CaseInsensitive,
        };

        const mockErrorResponse = {
            error: {
                message: "Invalid API Key",
                type: "invalid_request_error",
                code: "invalid_api_key",
            },
        };

        (window.fetch as any).mockResolvedValue({
            ok: false,
            status: 401,
            json: () => Promise.resolve(mockErrorResponse),
        });

        // ACT
        const result = await testDeepSeekConnection(mockSettings);

        // ASSERT
        expect(result).toEqual({
            success: false,
            message: 'Connection failed: Invalid API Key (Code: invalid_api_key)',
        });
        
        expect(window.fetch).toHaveBeenCalledTimes(1);
        expect(window.fetch).toHaveBeenCalledWith(
            mockSettings.deepseekApiEndpoint,
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mockSettings.deepseekApiKey}`,
                },
            })
        );
    });
});
