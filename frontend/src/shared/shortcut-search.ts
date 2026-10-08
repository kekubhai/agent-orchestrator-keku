import {
	APP_SHORTCUTS,
	defaultShortcutBindings,
	effectiveShortcutBindings,
	type KeybindingOverrides,
	type ShortcutBinding,
	type ShortcutDefinition,
} from "./shortcuts";

export type ShortcutSearchLabels = {
	label: (shortcut: ShortcutDefinition) => string;
	category: (shortcut: ShortcutDefinition) => string;
};

export type ShortcutSearchOptions = ShortcutSearchLabels & {
	query: string;
	isMac: boolean;
	overrides: KeybindingOverrides;
};

const modifierAliases = {
	ctrl: ["ctrl", "control"],
	meta: ["cmd", "command", "⌘", "meta", "win", "super", "meta-key"],
	alt: ["alt", "option", "⌥"],
	shift: ["shift"],
} as const;

function bindingTokens(binding: ShortcutBinding): readonly string[] {
	const modifiers = [
		...(binding.ctrl ? [modifierAliases.ctrl] : []),
		...(binding.meta ? [modifierAliases.meta] : []),
		...(binding.alt ? [modifierAliases.alt] : []),
		...(binding.shift ? [modifierAliases.shift] : []),
	];
	const key = (binding.code === "Backquote" ? "`" : binding.key).toLowerCase();
	const tokens = new Set<string>([key]);
	for (const aliases of modifiers) {
		for (const alias of aliases) {
			tokens.add(alias);
			if (/[^a-z]/i.test(alias)) tokens.add(`${alias}${key}`);
		}
	}

	const primary = modifiers.map((aliases) => aliases[0]);
	tokens.add([...primary, key].join("+"));
	for (let index = 0; index < modifiers.length; index += 1) {
		for (const alias of modifiers[index]) {
			tokens.add(
				[
					...primary.slice(0, index),
					alias,
					...primary.slice(index + 1),
					key,
				].join("+"),
			);
		}
	}
	return [...tokens];
}

function shortcutSearchTerms(
	shortcut: ShortcutDefinition,
	options: ShortcutSearchOptions,
): readonly string[] {
	const bindings = [
		...effectiveShortcutBindings(shortcut.id, options.isMac, options.overrides),
		...defaultShortcutBindings(shortcut.id, options.isMac),
	];
	const terms = [
		options.label(shortcut),
		options.category(shortcut),
		shortcut.id,
		...(shortcut.keywords ?? []),
	].map((term) => term.toLowerCase());
	for (const binding of bindings) terms.push(...bindingTokens(binding));
	if (Object.hasOwn(options.overrides, shortcut.id)) terms.push("modified");
	if (
		effectiveShortcutBindings(shortcut.id, options.isMac, options.overrides)
			.length === 0
	)
		terms.push("unassigned");
	if (shortcut.customizable === false) terms.push("fixed");
	return terms;
}

/** Returns whether every whitespace-delimited query token appears in a searchable shortcut field. */
export function matchesShortcutSearch(
	shortcut: ShortcutDefinition,
	options: ShortcutSearchOptions,
): boolean {
	const tokens = options.query
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean);
	if (tokens.length === 0) return true;
	const terms = shortcutSearchTerms(shortcut, options);
	return tokens.every((token) => terms.some((term) => term.includes(token)));
}

export function filterShortcuts(
	options: ShortcutSearchOptions,
): readonly ShortcutDefinition[] {
	return APP_SHORTCUTS.filter((shortcut) =>
		matchesShortcutSearch(shortcut, options),
	);
}
