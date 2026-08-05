export const id = (): string => crypto.randomUUID();

export const MOCK_DELAY = 400;

export const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
