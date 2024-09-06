/**
 * @vitest-environment jsdom
 */

import util from "node:util";
import superjson from "superjson";
import { act, render, renderHook } from "@testing-library/react";
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import useStorageState from "../src/useStorageState.js";
import memoryStorage from "../src/memoryStorage.js";

beforeEach(() => {
    // Throw an error when `console.error()` is called. This is especially useful in a React tests
    // because React uses it to show warnings and discourage you from shooting yourself in the foot.
    // Here are a few example warnings React throws:
    // - "Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded
    //   into the server renderer's output format. This will lead to a mismatch between the initial,
    //   non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in
    //   components that render exclusively on the client. See
    //   https://reactjs.org/link/uselayouteffect-ssr for common fixes."
    // - "Warning: Can't perform a React state update on an unmounted component. This is a no-op,
    //   but it indicates a memory leak in your application. To fix, cancel all subscriptions and
    //   asynchronous tasks in a useEffect cleanup function."
    // - "Warning: Cannot update a component (`Component`) while rendering a different component
    //   (`Component`). To locate the bad setState() call inside `Component`, follow the stack trace
    //   as described in https://reactjs.org/link/setstate-in-render"
    vi.spyOn(console, "error").mockImplementation(
        (format: string, ...args: any[]) => {
            throw new Error(util.format(format, ...args));
        },
    );
});

afterEach(() => {
    try {
        localStorage.clear();
        sessionStorage.clear();
    } catch {}
});

describe("useStorageState()", () => {
    test("defaultValue accepts lazy initializer (like useState)", () => {
        const { result } = renderHook(() =>
            useStorageState("todos", {
                defaultValue: () => ["first", "second"],
            }),
        );

        const [todos] = result.current;
        expect(todos).toStrictEqual(["first", "second"]);
    });

    test("initial state is written into the state", () => {
        const { result } = renderHook(() =>
            useStorageState("todos", { defaultValue: ["first", "second"] }),
        );

        const [todos] = result.current;
        expect(todos).toStrictEqual(["first", "second"]);
    });

    test(`initial state is written to localStorage`, () => {
        renderHook(() =>
            useStorageState("todos", {
                storeDefault: true,
                defaultValue: ["first", "second"],
            }),
        );

        expect(localStorage.getItem("todos")).toStrictEqual(
            JSON.stringify(["first", "second"]),
        );
    });

    test("updates state", () => {
        const { result } = renderHook(() =>
            useStorageState("todos", { defaultValue: ["first", "second"] }),
        );

        act(() => {
            const setTodos = result.current[1];

            setTodos(["third", "forth"]);
        });

        const [todos] = result.current;
        expect(todos).toStrictEqual(["third", "forth"]);
        expect(localStorage.getItem("todos")).toStrictEqual(
            JSON.stringify(["third", "forth"]),
        );
    });

    test("updates state with callback function", () => {
        const { result } = renderHook(() =>
            useStorageState("todos", { defaultValue: ["first", "second"] }),
        );

        act(() => {
            const setTodos = result.current[1];

            setTodos((value) => [...value, "third", "forth"]);
        });

        const [todos] = result.current;
        expect(todos).toStrictEqual(["first", "second", "third", "forth"]);
        expect(localStorage.getItem("todos")).toStrictEqual(
            JSON.stringify(["first", "second", "third", "forth"]),
        );
    });

    test("does not fail when having an invalid data in localStorage", () => {
        localStorage.setItem("todos", "some random string");

        const { result } = renderHook(() =>
            useStorageState("todos", { defaultValue: ["first", "second"] }),
        );

        const [todos] = result.current;
        expect(todos).toStrictEqual(["first", "second"]);
    });

    test("updating writes into localStorage", () => {
        const { result } = renderHook(() =>
            useStorageState("todos", { defaultValue: ["first", "second"] }),
        );

        act(() => {
            const setTodos = result.current[1];

            setTodos(["third", "forth"]);
        });

        expect(localStorage.getItem("todos")).toStrictEqual(
            JSON.stringify(["third", "forth"]),
        );
    });

    test("initially gets value from local storage if there is a value", () => {
        localStorage.setItem("todos", JSON.stringify(["third", "forth"]));

        const { result } = renderHook(() =>
            useStorageState("todos", { defaultValue: ["first", "second"] }),
        );

        const [todos] = result.current;
        expect(todos).toStrictEqual(["third", "forth"]);
    });

    test("handles errors thrown by localStorage", () => {
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error();
        });

        const { result } = renderHook(() =>
            useStorageState("set-item-will-throw", { defaultValue: "" }),
        );

        expect(() => {
            act(() => {
                const setValue = result.current[1];
                setValue("will-throw");
            });
        }).not.toThrow();
    });

    // https://github.com/astoilkov/use-local-storage-state/issues/62
    test("simulate blocking all the cookies in Safari", () => {
        // in Safari, even just accessing `localStorage` throws "SecurityError: The operation is
        // insecure."
        vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
            throw new Error();
        });

        const { result } = renderHook(() =>
            useStorageState("set-item-will-throw", { defaultValue: "" }),
        );

        expect(() => {
            act(() => {
                const setValue = result.current[1];
                setValue("will-throw");
            });
        }).not.toThrow();
    });

    // https://github.com/astoilkov/use-storage-state/issues/2
    test("Chrome option to not allow sites to save data on device", () => {
        // in Safari, even just accessing `localStorage` throws "SecurityError: The operation is
        // insecure."
        vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
            throw new Error();
        });
        vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
            throw new Error();
        });

        const { result } = renderHook(() =>
            useStorageState<string | undefined>("set-item-will-throw", {
                defaultValue: "",
            }),
        );

        expect(() => {
            act(() => {
                const setValue = result.current[1];
                setValue("will-throw");
            });
        }).not.toThrow();
    });

    test("can set value to `undefined`", () => {
        const { result: resultA, unmount } = renderHook(() =>
            useStorageState<string[] | undefined>("todos", {
                defaultValue: ["first", "second"],
            }),
        );
        act(() => {
            const [, setValue] = resultA.current;
            setValue(undefined);
        });
        unmount();

        const { result: resultB } = renderHook(() =>
            useStorageState<string[] | undefined>("todos", {
                defaultValue: ["first", "second"],
            }),
        );
        const [value] = resultB.current;
        expect(value).toBe(undefined);
    });

    test("`defaultValue` can be set to `null`", () => {
        const { result } = renderHook(() =>
            useStorageState<string[] | null>("todos", {
                defaultValue: null,
            }),
        );
        const [value] = result.current;
        expect(value).toBe(null);
    });

    test("can set value to `null`", () => {
        const { result: resultA, unmount } = renderHook(() =>
            useStorageState<string[] | null>("todos", {
                defaultValue: ["first", "second"],
            }),
        );
        act(() => {
            const [, setValue] = resultA.current;
            setValue(null);
        });
        unmount();

        const { result: resultB } = renderHook(() =>
            useStorageState<string[] | null>("todos", {
                defaultValue: ["first", "second"],
            }),
        );
        const [value] = resultB.current;
        expect(value).toBe(null);
    });

    test("can reset value to default", () => {
        const { result: resultA, unmount: unmountA } = renderHook(() =>
            useStorageState("todos", { defaultValue: ["first", "second"] }),
        );
        act(() => {
            const [, setValue] = resultA.current;
            setValue(["third", "forth"]);
        });
        unmountA();

        const { result: resultB, unmount: unmountB } = renderHook(() =>
            useStorageState("todos", { defaultValue: ["first", "second"] }),
        );
        act(() => {
            const [, , removeItem] = resultB.current;
            removeItem();
        });
        unmountB();

        const { result: resultC } = renderHook(() =>
            useStorageState("todos", { defaultValue: ["first", "second"] }),
        );
        const [value] = resultC.current;
        expect(value).toStrictEqual(["first", "second"]);
    });

    test("returns the same update function when the value is saved", () => {
        const functionMock = vi.fn();
        const { rerender } = renderHook(() => {
            const [, setTodos] = useStorageState("todos", {
                defaultValue: ["first", "second"],
            });
            useMemo(functionMock, [setTodos]);
        });

        rerender();

        expect(functionMock.mock.calls.length).toStrictEqual(1);
    });

    test('changing the "key" property updates the value from local storage', () => {
        localStorage.setItem("valueA", JSON.stringify("A"));
        localStorage.setItem("valueB", JSON.stringify("B"));

        const { result, rerender } = renderHook(
            (props) => useStorageState(props.key, undefined),
            {
                initialProps: {
                    key: "valueA",
                },
            },
        );

        rerender({ key: "valueB" });

        const [value] = result.current;
        expect(value).toStrictEqual("B");
    });

    // https://github.com/astoilkov/use-local-storage-state/issues/30
    test(`when defaultValue isn't provided — don't write to localStorage on initial render`, () => {
        renderHook(() => useStorageState("todos"));

        expect(localStorage.getItem("todos")).toStrictEqual(null);
    });

    // https://github.com/astoilkov/use-local-storage-state/issues/33
    test(`localStorage value shouldn't be overwritten`, () => {
        localStorage.setItem("color", "red");

        renderHook(() => useStorageState("todos", { defaultValue: "blue" }));

        expect(localStorage.getItem("color")).toStrictEqual("red");
    });

    test("calling update from one hook updates the other", () => {
        const { result: resultA } = renderHook(() =>
            useStorageState("todos", { defaultValue: ["first", "second"] }),
        );
        const { result: resultB } = renderHook(() =>
            useStorageState("todos", { defaultValue: ["first", "second"] }),
        );

        act(() => {
            const setTodos = resultA.current[1];

            setTodos(["third", "forth"]);
        });

        const [todos] = resultB.current;
        expect(todos).toStrictEqual(["third", "forth"]);
    });

    test("can reset value to default", () => {
        const { result: resultA } = renderHook(() =>
            useStorageState("todos", { defaultValue: ["first", "second"] }),
        );
        const { result: resultB } = renderHook(() =>
            useStorageState("todos", { defaultValue: ["first", "second"] }),
        );

        act(() => {
            const setTodosA = resultA.current[1];
            const removeTodosB = resultB.current[2];

            setTodosA(["third", "forth"]);

            removeTodosB();
        });

        const [todos] = resultB.current;
        expect(todos).toStrictEqual(["first", "second"]);
    });

    // https://github.com/astoilkov/use-local-storage-state/issues/30
    test("when defaultValue isn't provided — don't write to localStorage on initial render", () => {
        renderHook(() => useStorageState("todos"));

        expect(localStorage.getItem("todos")).toStrictEqual(null);
    });

    test("basic setup with default value", () => {
        const { result } = renderHook(() =>
            useStorageState("todos", {
                defaultValue: ["first", "second"],
            }),
        );

        const [todos] = result.current;
        expect(todos).toStrictEqual(["first", "second"]);
    });

    test("if there are already items in localStorage", () => {
        localStorage.setItem("todos", JSON.stringify([4, 5, 6]));

        const { result } = renderHook(() =>
            useStorageState("todos", {
                defaultValue: ["first", "second"],
            }),
        );

        const [todos] = result.current;
        expect(todos).toStrictEqual([4, 5, 6]);
    });

    test("supports changing the key", () => {
        let key = "todos1";

        const { rerender } = renderHook(() =>
            useStorageState(key, {
                storeDefault: true,
                defaultValue: ["first", "second"],
            }),
        );

        key = "todos2";

        rerender();

        expect(JSON.parse(localStorage.getItem("todos1")!)).toStrictEqual([
            "first",
            "second",
        ]);
        expect(JSON.parse(localStorage.getItem("todos2")!)).toStrictEqual([
            "first",
            "second",
        ]);
    });

    // https://github.com/astoilkov/use-local-storage-state/issues/39
    // https://github.com/astoilkov/use-local-storage-state/issues/43
    // https://github.com/astoilkov/use-local-storage-state/pull/40
    test(`when ssr: true — don't call useEffect() and useLayoutEffect() on first render`, () => {
        let calls = 0;

        function Component() {
            useStorageState("color", {
                defaultValue: "red",
            });

            useEffect(() => {
                calls += 1;
            });

            return null;
        }

        render(<Component />);

        expect(calls).toBe(1);
    });

    // https://github.com/astoilkov/use-local-storage-state/issues/44
    test(`setState() shouldn't change between renders`, () => {
        function Component() {
            const [value, setValue] = useStorageState("number", {
                defaultValue: 1,
            });

            useEffect(() => {
                setValue((value) => value + 1);
            }, [setValue]);

            return <div>{value}</div>;
        }

        const { queryByText } = render(<Component />);

        expect(queryByText(/^2$/u)).toBeTruthy();
    });

    // https://github.com/astoilkov/use-local-storage-state/issues/43
    test(`setState() during render`, () => {
        function Component() {
            const [value, setValue] = useStorageState("number", {
                defaultValue: 0,
            });

            if (value === 0) {
                setValue(1);
            }

            return <div>{value}</div>;
        }

        const { queryByText } = render(<Component />);

        expect(queryByText(/^0$/u)).not.toBeTruthy();
        expect(queryByText(/^1$/u)).toBeTruthy();
    });

    test(`calling setValue() from useLayoutEffect() should update all useStorageState() instances`, () => {
        function App() {
            return (
                <>
                    <Component update={false} />
                    <Component update={true} />
                </>
            );
        }

        function Component({ update }: { update: boolean }) {
            const [value, setValue] = useStorageState("number", {
                defaultValue: 0,
            });

            useLayoutEffect(() => {
                if (update) {
                    setValue(1);
                }
            }, []);

            return <div>{value}</div>;
        }

        const { queryAllByText } = render(<App />);

        expect(queryAllByText(/^1$/u)).toHaveLength(2);
    });

    describe("hydration", () => {
        test(`non-primitive defaultValue to return the same value by reference`, () => {
            const defaultValue = ["first", "second"];
            const hook = renderHook(
                () =>
                    useStorageState("todos", {
                        defaultValue,
                    }),
                { hydrate: true },
            );
            const [todos] = hook.result.current;
            expect(todos).toBe(defaultValue);
        });
    });

    describe('"storage" event', () => {
        const fireStorageEvent = (
            storageArea: Storage,
            key: string,
            newValue: unknown,
        ): void => {
            const oldValue = localStorage.getItem(key);

            if (newValue === null) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(newValue));
            }

            window.dispatchEvent(
                new StorageEvent("storage", {
                    key,
                    oldValue,
                    storageArea,
                    newValue: JSON.stringify(newValue),
                }),
            );
        };

        test("storage event updates state", () => {
            const { result: resultA } = renderHook(() =>
                useStorageState("todos", { defaultValue: ["first", "second"] }),
            );
            const { result: resultB } = renderHook(() =>
                useStorageState("todos", { defaultValue: ["first", "second"] }),
            );

            act(() => {
                fireStorageEvent(localStorage, "todos", ["third", "forth"]);
            });

            const [todosA] = resultA.current;
            expect(todosA).toStrictEqual(["third", "forth"]);

            const [todosB] = resultB.current;
            expect(todosB).toStrictEqual(["third", "forth"]);
        });

        test('"storage" event updates state to default value', () => {
            const { result } = renderHook(() =>
                useStorageState("todos", { defaultValue: ["first", "second"] }),
            );

            act(() => {
                const setTodos = result.current[1];
                setTodos(["third", "forth"]);

                fireStorageEvent(localStorage, "todos", null);
            });

            const [todosB] = result.current;
            expect(todosB).toStrictEqual(["first", "second"]);
        });

        test(`unrelated storage update doesn't do anything`, () => {
            const { result } = renderHook(() =>
                useStorageState("todos", { defaultValue: ["first", "second"] }),
            );

            act(() => {
                // trying with sessionStorage
                fireStorageEvent(sessionStorage, "todos", ["third", "forth"]);

                // trying with a non-relevant key
                fireStorageEvent(localStorage, "not-todos", ["third", "forth"]);
            });

            const [todosA] = result.current;
            expect(todosA).toStrictEqual(["first", "second"]);
        });

        test('`storageSync: false` disables "storage" event', () => {
            const { result } = renderHook(() =>
                useStorageState("todos", {
                    defaultValue: ["first", "second"],
                    sync: false,
                }),
            );

            act(() => {
                fireStorageEvent(localStorage, "todos", ["third", "forth"]);
            });

            const [todosA] = result.current;
            expect(todosA).toStrictEqual(["first", "second"]);
        });
    });

    describe('"serializer" option', () => {
        test("can serialize Date from initial value", () => {
            const date = new Date();

            const { result } = renderHook(() =>
                useStorageState("date", {
                    defaultValue: [date],
                    serializer: superjson,
                }),
            );

            const [value] = result.current;
            expect(value).toStrictEqual([date]);
        });

        test("can serialize Date (in array) from setValue", () => {
            const date = new Date();

            const { result } = renderHook(() =>
                useStorageState<(Date | null)[]>("date", {
                    defaultValue: [null],
                    serializer: superjson,
                }),
            );

            act(() => {
                const setValue = result.current[1];
                setValue([date]);
            });

            const [value, _] = result.current;
            expect(value).toStrictEqual([date]);
        });

        test(`JSON as serializer can't handle undefined as value`, () => {
            const { result: resultA, unmount } = renderHook(() =>
                useStorageState<string[] | undefined>("todos", {
                    defaultValue: ["first", "second"],
                    serializer: JSON,
                }),
            );
            act(() => {
                const [, setValue] = resultA.current;
                setValue(undefined);
            });
            unmount();

            const { result: resultB } = renderHook(() =>
                useStorageState<string[] | undefined>("todos", {
                    defaultValue: ["first", "second"],
                    serializer: JSON,
                }),
            );
            const [value] = resultB.current;
            expect(value).not.toBe(undefined);
        });
    });

    describe("storage option", () => {
        test("switching between two storage values", () => {
            const { result, rerender } = renderHook(
                ({ storage }: { storage: "session" | "local" }) =>
                    useStorageState<number>("count", {
                        defaultValue: 0,
                        storeDefault: true,
                        storage: storage,
                    }),
                {
                    initialProps: { storage: "session" },
                },
            );

            const [count] = result.current;
            expect(count).toBe(0);

            act(() => {
                const [, setCount] = result.current;
                setCount(1);
            });

            expect(sessionStorage.getItem("count")).toBe("1");
            expect(localStorage.getItem("count")).toBe(null);

            rerender({ storage: "local" });

            expect(sessionStorage.getItem("count")).toBe("1");
            expect(localStorage.getItem("count")).toBe("0");

            act(() => {
                const [, setCount] = result.current;
                setCount(2);
            });

            expect(sessionStorage.getItem("count")).toBe("1");
            expect(localStorage.getItem("count")).toBe("2");
        });

        test("undefined with memoryFallback: false", () => {
            const { result } = renderHook(() =>
                useStorageState("count", {
                    storage: undefined,
                    memoryFallback: false,
                    defaultValue: 99,
                }),
            );
            const [, setCount] = result.current;

            act(() => {
                setCount(100);
            });
            expect(result.current[0]).toBe(99);
        });

        test("memoryStorage", () => {
            const { result } = renderHook(() =>
                useStorageState<number>("count", {
                    storage: memoryStorage,
                }),
            );
            const [, setCount, removeItem] = result.current;

            act(() => {
                removeItem();
            });
            expect(result.current[0]).toBe(undefined);

            act(() => {
                setCount(1);
            });
            expect(result.current[0]).toBe(1);

            act(() => {
                setCount(undefined);
            });
            expect(result.current[0]).toBe(undefined);
        });
    });
});
