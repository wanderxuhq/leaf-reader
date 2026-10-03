/**
 * Icon Button Component - wraps Obsidian setIcon for SolidJS
 */

import { createEffect } from 'solid-js';
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

	createEffect(() => {
		const name = props.name;
		if (btnRef) setIcon(btnRef, name);
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
