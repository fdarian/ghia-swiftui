import { solid } from '@ghia/solid/vite';
import { ghia } from 'ghia';
import { defineConfig } from 'vite';

// The entry comes from the command line: `ghia dev src/main.tsx`, or
// `scripts/run.ts <script>` for a capture or check script.
export default defineConfig({
	plugins: [ghia(), solid()],
});
