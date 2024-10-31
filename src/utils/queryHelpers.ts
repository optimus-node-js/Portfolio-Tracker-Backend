// src/utils/queryHelpers.ts

import { ParsedQs } from 'qs';

/**
 * Parses a query parameter that can be a string, string array, ParsedQs, or ParsedQs array.
 * Returns an array of strings, splitting by commas if necessary.
 *
 * @param param - The query parameter to parse.
 * @returns An array of trimmed strings.
 */
export const parseStringParam = (param: unknown): string[] => {
    if (!param) return [];

    if (Array.isArray(param)) {
        // Flatten the array and split each string by commas
        return param.reduce<string[]>((acc, val) => {
            if (typeof val === 'string') {
                acc.push(...val.split(',').map(s => s.trim()));
            }
            return acc;
        }, []);
    }

    if (typeof param === 'string') {
        return param.split(',').map(s => s.trim());
    }

    return [];
};
