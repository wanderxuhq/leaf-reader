import { ErrorBoundary, type JSX } from 'solid-js';
import { Notice } from 'obsidian';

interface EpubErrorBoundaryProps {
	children: JSX.Element;
}

function ErrorFallback(err: Error, reset: () => void) {
	return (
		<div class="epub-error-boundary">
			<div class="epub-error-content">
				<h3>Reading Error</h3>
				<p>Something went wrong while rendering the reader.</p>
				<button
					class="epub-error-retry-btn"
					onClick={() => reset()}
				>
					Retry
				</button>
			</div>
		</div>
	);
}

export function EpubErrorBoundary(props: EpubErrorBoundaryProps) {
	return (
		<ErrorBoundary
			fallback={(err, reset) => {
				console.error('[EpubErrorBoundary] Caught error:', err);
				new Notice('Reader encountered an error. Please try reopening the file.');
				return ErrorFallback(err as Error, reset);
			}}
		>
			{props.children}
		</ErrorBoundary>
	);
}