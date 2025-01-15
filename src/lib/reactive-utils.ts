import { type Accessor, createSignal, createEffect } from "solid-js";

// https://medium.com/@davidcallanan/async-solid-js-the-desire-for-createeventual-93e2ae846ccb
export function createEventual<T>(async_func: () => Promise<T>): Accessor<T | undefined> {
    const [derivative, setDerivative] = createSignal<T>();

    let outstandingPromise: Promise<T>;

    createEffect(() => {
        const promise = (async () => await async_func())();
        outstandingPromise = promise;

        promise.then((result) => {
            if (promise !== outstandingPromise) {
                return;
            }

            setDerivative(() => result);
        });

        promise.catch((error) => {
            if (promise !== outstandingPromise) {
                return;
            }

            setDerivative(() => error);
        });
    });

    return derivative;
}
