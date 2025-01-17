/* @refresh reload */
import { render } from 'solid-js/web';

import { Route, Router, type RouteSectionProps } from '@solidjs/router';
import { Component, type JSXElement, lazy, Suspense } from 'solid-js';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
    throw new Error(
        'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
    );
}

function App(props: RouteSectionProps) {
    return <>
        {props.children}
    </>;
}

render(() => (
    <Router root={App}>
        <Route path="/" component={lazy(() => import('./pages/Home'))} />
        <Route path="/watch-rtmp/:username" component={lazy(() => import('./pages/WatchRtmp'))} />
        <Route path="/watch-streamlink/:host/:path" component={lazy(() => import('./pages/WatchStreamlink'))} />
        <Route path="/listen/:url" component={lazy(() => import('./pages/Listen'))} />
    </Router>
), root!);
