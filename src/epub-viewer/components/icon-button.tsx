/**
 * Icon Button Component - wraps Obsidian setIcon for SolidJS
 */

import { onMount, createEffect } from 'solid-js';
import { setIcon } from 'obsidian';

export interface IconButtonProps {
	name: string;
	ariaLabel: string;
	onClick: () => void;
	class?: string;
	ref?: (el: HTMLButtonElement) => void;
	disabled?: boolean;
	expanded?: boolean;
}

export function IconButton(props: IconButtonProps) {
	let btnRef: HTMLButtonElement | undefined;

	const applyIcon = () => {
		if (btnRef && btnRef.isConnected) {
			requestAnimationFrame(() => {
				if (btnRef && btnRef.isConnected) {
					setIcon(btnRef, props.name);
				}
			});
		}
	};

	onMount(() => {
		applyIcon();
	});

	createEffect(() => {
		void props.name;
		applyIcon();
	});

	return (
		<button
			ref={(el) => {
				btnRef = el;
				props.ref?.(el);
			}}
			class={`epub-header-btn ${props.class || ''}`}
			type="button"
			aria-label={props.ariaLabel}
			title={props.ariaLabel}
			aria-expanded={props.expanded}
			onClick={() => !props.disabled && props.onClick()}
			disabled={props.disabled}
		/>
	);
}
