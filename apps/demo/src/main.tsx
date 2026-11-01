import { render } from '@ghia/solid';
import { createFilePanelStorage, setPanelStorage } from 'ghia-swiftui';
import { App } from '#src/app.tsx';
import { windowOptions } from '#src/window-options.ts';

// Layouts are kept under ~/Library/Application Support/ghia-swiftui-demo/.
setPanelStorage(createFilePanelStorage({ appName: 'ghia-swiftui-demo' }));

render(() => <App />, windowOptions);
