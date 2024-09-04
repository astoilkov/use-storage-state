import useStorageState, {
    type StorageState,
    type StorageStateOptions,
} from "./src/useStorageState.js";
import memoryStorage from "./src/memoryStorage.js";

export default useStorageState;

export { memoryStorage };

export type { StorageState, StorageStateOptions };
