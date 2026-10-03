import { t } from '../../i18n';
import { ErrorBoundary, type JSX } from 'solid-js';
import { Notice } from 'obsidian';

interface EpubErrorBoundaryProps {
	children: JSX.Element;
}

function ErrorFallback(err: Error, reset: () => void) {
	return (
		<div class="epub-error-boundary">
			<div class="epub-error-content">
				<h3>{t('readingError')}</h3>
				<p>{t('renderFailed')}</p>
				<button
					class="epub-error-retry-btn"
					onClick={() => reset()}
				>{t('retry')}</button>
			</div>
		</div>
	);
}

export function EpubErrorBoundary(props: EpubErrorBoundaryProps) {
	return (
		<ErrorBoundary
			fallback={(err, reset) => {
				console.error('[EpubErrorBoundary] Caught error:', err);
				new Notice(t('reopenBook'));
				return ErrorFallback(err as Error, reset);
			}}
		>
			{props.children}
		</ErrorBoundary>
	);
}