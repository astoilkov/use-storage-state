class MemoryStorage {
    private storage = new Map<string, string>();

    getItem(key: string): string | null {
        if (this.storage.has(key)) {
            const value = this.storage.get(key);
            return value === undefined ? "undefined" : value;
        }
        return null;
    }

    setItem(key: string, value: string): void {
        this.storage.set(key, value);
    }

    removeItem(key: string): void {
        this.storage.delete(key);
    }
}

const memoryStorage = new MemoryStorage();

export default memoryStorage;
