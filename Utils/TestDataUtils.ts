export type TestDataVariables = Record<string, string>;

/**
 * Replaces {name} placeholders in the endpoint and body of a test data entry,
 * for values only known at run time (e.g. the id of an order placed earlier in a flow).
 */
export function applyVariables<T>(testData: T, variables?: TestDataVariables): T {
    const resolved = JSON.stringify(testData).replace(/\{(\w+)\}/g, (_match, name: string) => {
        const value = variables?.[name];
        if (value === undefined) {
            throw new Error(`No value supplied for test data variable "${name}"`);
        }
        return value;
    });
    return JSON.parse(resolved);
}
