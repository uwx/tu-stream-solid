import { type Accessor, createSignal, createEffect } from "solid-js";

export function createEventual<T>(async_func: () => Promise<T>): Accessor<T | undefined> {
    const [derivative, setDerivative] = createSignal<T>();

    let outstanding_promise: Promise<T>;

    createEffect(() => {
        const promise = (async () => await async_func())();
        outstanding_promise = promise;

        promise.then((result) => {
            if (promise !== outstanding_promise) {
                return;
            }

            setDerivative(() => result);
        });

        promise.catch((error) => {
            if (promise !== outstanding_promise) {
                return;
            }

            setDerivative(() => error);
        });
    });

    return derivative;
}
