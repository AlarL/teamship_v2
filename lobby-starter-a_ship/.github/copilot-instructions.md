# GitHub Copilot Instructions for kokimoki/lobby-starter

This project is based on a starter template using Kokimoki SDK. The start template provides the following functionality:

- Lobby management - create or join a lobby (`src/views/create-or-join-lobby.tsx`)
- Players in the same lobby can communicate in real time by using `lobbyStore`
- Players in the same lobby can be aware of each others' presence using `lobbyAwareness`
- Each player has a local state that is not synced to the server `playerStore`

## Spec-driven development

The project is developed in a spec-driven manner. The specification is defined in `spec.md` file. When asked to implement something, always check the specification first and make sure that the implementation follows the spec.

Create or update the specification as needed when the implementation deviates from the spec or when new features are added.

Do not hesitate to ask for clarifications if the spec is not clear.

## General guidelines

- Use TypeScript and React best practices for all components in `src/`.
- Prefer functional components and hooks (`useState`, `useEffect`, custom hooks) for state and side effects.
- Use Valtio for state management (`useSnapshot`, proxies in `state/stores/` as Kokimoki stores).
- Use context providers (see `lobby/provider.tsx`) for lobby state and awareness.
- Use utility functions from `utils/`, e.g. for classnames (`cn`).
- For UI, use Tailwind CSS classes and DaisyUI components for styling.
- Organize code by feature: components in `components/`, hooks in `hooks/`, state in `state/`, services in `services/`, and views in `views/`.
- Use async/await for all network and state transactions (see `kmClient.transact`).
- Keep configuration files (`config/`, `vite.config.ts`, `tsconfig*.json`) up to date and consistent.
- Write new code in the style and structure of existing files.
- Add types in `types/` and keep type safety throughout the codebase.
- When adding features, follow the established folder and naming conventions.
- Use `kmClient.serverTimestamp()` for time-related matters as this will be synced among players.

## Player store

The local player store is defined in `state/stores/player-store.ts` which contains data only stored on the player device. Example usage:

```ts
await kmClient.transact([playerStore], ([playerState]) => {
	playerState.currentView = 'view-name';
});
```

The player actions should be defined in `state/actions/player-actions.ts`. As an example, there is the `currentView` value that
is used for routing.

## Lobby Store

The lobby store interface is defined in `state/stores/lobby-store.ts` and contains data shared among all players in a lobby. The lobby store instance itself is created by `lobby-provider.tsx`. Example usage:

```ts
await kmClient.transact([lobbyStore], ([lobbyState]) => {
	lobbyState.name = 'My Lobby';
});
```

The lobby actions should be defined in `state/actions/lobby-actions.ts`.

## Combining Stores

- You can combine writing to multiple stores in a single transaction:

```ts
await kmClient.transact(
	[playerStore, lobbyStore],
	([playerState, lobbyState]) => {
		playerState.name = 'My Name';
		lobbyState.name = 'My Lobby';
	}
);
```

Such actions should be defined in `state/actions/lobby-actions.ts`, use your best judgment.

## Lobby Awareness

- When working with lobby connections, group by `clientId` because each player can open multiple tabs:

  ```ts
  const lobbyClients = Object.entries(lobbyConnections).reduce(
  	(acc, [_connectionId, connection]) => {
  		if (!acc[connection.clientId]) {
  			acc[connection.clientId] = connection;
  		}
  		return acc;
  	},
  	{} as Record<string, { lastPing: number; clientId: string }>
  );
  ```

- Use `Object.entries(lobbyClients).length` for the number of unique players.

## Creating timers

Make use of writing `kmClient.serverTimestamp()` to a store and the `useServerTimer` hook to create timers that are synced across all players in a lobby.

## Configuration

For parameters that should be configurable, use the `config/schema.ts` file and `zod` to manage a configuration. Always give default values to parameters. Always keep in mind when asked to implement something how it relates to configuration.

The `config/schema.ts` file should contain only short valid defaults for the schema. Actual default configuration should be defined as YAML in `default.config.yaml` file following the schema. Always use quotes for strings in YAML files.

When a configuration field contains markdown then use `Md` suffix, e.g. `welcomeMessageMd`. Markdown can be rendered using the `react-markdown` package and applying the `prose` class from Tailwind CSS.

## Host controller

The `src/hooks/useHostController.ts` hook always maintains a single connection that is the host. This connection can run logic that would not make sense to run on multiple devices, e.g. affecting lobby state after a timeout is reached.

## Theming

- Always design with mobile-first in mind.
- Use Tailwind and DaisyUI classes for styling.
- Do not make edits to `src/daisyui.css`.
- Use `default.config.yaml` to edit the DaisyUI `theme` variables values instead.
- Custom fonts and styles go to `src/global.css`, but prioritize using DaisyUI and Tailwind classes.
- Do not create multiple themes, just use the default theme and edit its values in `default.config.yaml`.

### daisyUI color rules

1. daisyUI adds semantic color names to Tailwind CSS colors
2. daisyUI color names can be used in utility classes, like other Tailwind CSS color names. for example, `bg-primary` will use the primary color for the background
3. daisyUI color names include variables as value so they can change based the theme
4. There's no need to use `dark:` for daisyUI color names
5. Ideally only daisyUI color names should be used for colors so the colors can change automatically based on the theme
6. If a Tailwind CSS color name (like `red-500`) is used, it will be same red color on all themes
7. If a daisyUI color name (like `primary`) is used, it will change color based on the theme
8. Using Tailwind CSS color names for text colors should be avoided because Tailwind CSS color `text-gray-800` on `bg-base-100` would be unreadable on a dark theme - because on dark theme, `bg-base-100` is a dark color
9. `*-content` colors should have a good contrast compared to their associated colors
10. suggestion - when designing a page use `base-*` colors for majority of the page. use `primary` color for important elements

### daisyUI color rules

1. daisyUI adds semantic color names to Tailwind CSS colors
2. daisyUI color names can be used in utility classes, like other Tailwind CSS color names. for example, `bg-primary` will use the primary color for the background
3. daisyUI color names include variables as value so they can change based the theme
4. There's no need to use `dark:` for daisyUI color names
5. Ideally only daisyUI color names should be used for colors so the colors can change automatically based on the theme
6. If a Tailwind CSS color name (like `red-500`) is used, it will be same red color on all themes
7. If a daisyUI color name (like `primary`) is used, it will change color based on the theme
8. Using Tailwind CSS color names for text colors should be avoided because Tailwind CSS color `text-gray-800` on `bg-base-100` would be unreadable on a dark theme - because on dark theme, `bg-base-100` is a dark color
9. `*-content` colors should have a good contrast compared to their associated colors
10. suggestion - when designing a page use `base-*` colors for majority of the page. use `primary` color for important elements

### DaisyUI components

### toggle

Toggle is a switch-like checkbox

```html
<input type="checkbox" class="toggle {MODIFIER}" />
```

- color: `toggle-primary`, `toggle-secondary`, `toggle-accent`, `toggle-neutral`, `toggle-success`, `toggle-warning`, `toggle-info`, `toggle-error`
- size: `toggle-xs`, `toggle-sm`, `toggle-md`, `toggle-lg`, `toggle-xl`
- {MODIFIER} is optional and can have one of each color/size class names

### toast

Toast is a wrapper to stack elements, positioned on the corner of page

```html
<div class="toast {MODIFIER}">{CONTENT}</div>
```

- placement: `toast-start`, `toast-center`, `toast-end`, `toast-top`, `toast-middle`, `toast-bottom`
- {MODIFIER} is optional and can have one of the placement class names

### timeline

Timeline shows a list of events in chronological order

```html
<ul class="timeline {MODIFIER}">
	<li>
		<div class="timeline-start">{start}</div>
		<div class="timeline-middle">{icon}</div>
		<div class="timeline-end">{end}</div>
	</li>
	<!-- more items -->
</ul>
```

- part: `timeline-start`, `timeline-middle`, `timeline-end`
- modifier: `timeline-snap-icon`, `timeline-box`, `timeline-compact`
- direction: `timeline-vertical`, `timeline-horizontal`
- {MODIFIER} is optional and can have one of the modifier/direction class names
- Vertical is default; use `timeline-horizontal` for horizontal
- Use `timeline-snap-icon` to snap the icon to the start instead of middle
- Use `timeline-compact` to force all items on one side

### textarea

Textarea allows users to enter text in multiple lines

```html
<textarea class="textarea {MODIFIER}" placeholder="Bio"></textarea>
```

- style: `textarea-ghost`
- color: `textarea-neutral`, `textarea-primary`, `textarea-secondary`, `textarea-accent`, `textarea-info`, `textarea-success`, `textarea-warning`, `textarea-error`
- size: `textarea-xs`, `textarea-sm`, `textarea-md`, `textarea-lg`, `textarea-xl`
- {MODIFIER} is optional and can have one of each style/color/size class names

### table

Table can be used to show a list of data in a table format

```html
<div class="overflow-x-auto">
	<table class="{MODIFIER} table">
		<thead>
			<tr>
				<th></th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<th></th>
			</tr>
		</tbody>
	</table>
</div>
```

- modifier: `table-zebra`, `table-pin-rows`, `table-pin-cols`
- size: `table-xs`, `table-sm`, `table-md`, `table-lg`, `table-xl`
- {MODIFIER} is optional and can have one of each modifier/size class names
- Use `overflow-x-auto` on the wrapper to make the table horizontally scrollable on small screens

### tab

Tabs can be used to show a list of links in a tabbed format

```html
<div role="tablist" class="tabs {MODIFIER}">
	<button role="tab" class="tab">Tab</button>
	<!-- more tabs -->
</div>
```

- part: `tab`, `tab-content`
- style: `tabs-box`, `tabs-border`, `tabs-lift`
- modifier: `tab-active`, `tab-disabled`
- placement: `tabs-top`, `tabs-bottom`
- {MODIFIER} is optional and can have one of the style/size class names
- Radio inputs are needed for tab content to work with tab click
- If tabs gets a background then every tab inside it becomes rounded from both top corners

### status

Status is a tiny indicator to show a current state like online, offline, error, etc

```html
<span class="status {MODIFIER}"></span>
```

- color: `status-neutral`, `status-primary`, `status-secondary`, `status-accent`, `status-info`, `status-success`, `status-warning`, `status-error`
- size: `status-xs`, `status-sm`, `status-md`, `status-lg`, `status-xl`
- {MODIFIER} is optional and can have one of the color/size class names
- This component does not render anything visible on its own

### select

Select is used to pick a value from a list of options

```html
<select class="select {MODIFIER}">
	<option>Option</option>
</select>
```

- style: `select-ghost`
- color: `select-neutral`, `select-primary`, `select-secondary`, `select-accent`, `select-info`, `select-success`, `select-warning`, `select-error`
- size: `select-xs`, `select-sm`, `select-md`, `select-lg`, `select-xl`
- {MODIFIER} is optional and can have one of each style/color/size class names

### range

Range slider is used to select a value by sliding a handle

```html
<input type="range" min="0" max="100" value="40" class="range {MODIFIER}" />
```

- color: `range-neutral`, `range-primary`, `range-secondary`, `range-accent`, `range-success`, `range-warning`, `range-info`, `range-error`
- size: `range-xs`, `range-sm`, `range-md`, `range-lg`, `range-xl`
- {MODIFIER} is optional and can have one of each color/size class names
- You must specify `min` and `max` attributes

### radio

Radio buttons allow the user to select one option

```html
<input type="radio" name="{name}" class="radio {MODIFIER}" />
```

- color: `radio-neutral`, `radio-primary`, `radio-secondary`, `radio-accent`, `radio-success`, `radio-warning`, `radio-info`, `radio-error`
- size: `radio-xs`, `radio-sm`, `radio-md`, `radio-lg`, `radio-xl`
- {MODIFIER} is optional and can have one of the size/color class names
- Replace `{name}` with a unique name for the radio group
- Each set of radio inputs should have unique `name` attributes to avoid conflicts with other sets on the same page

### progress

Progress bar can be used to show the progress of a task or the passing of time

```html
<progress class="progress {MODIFIER}" value="50" max="100"></progress>
```

- color: `progress-neutral`, `progress-primary`, `progress-secondary`, `progress-accent`, `progress-info`, `progress-success`, `progress-warning`, `progress-error`
- {MODIFIER} is optional and can have one of the color class names
- You must specify `value` and `max` attributes

### radial-progress

Radial progress can be used to show the progress of a task or the passing of time

```html
<div
	class="radial-progress"
	style="--value:70;"
	aria-valuenow="70"
	role="progressbar"
>
	70%
</div>
```

- The `--value` CSS variable and text must be a number between 0 and 100
- Add `aria-valuenow="{value}"` so screen readers can read the value; also set `role="progressbar"`
- Use `div` instead of `progress` because browsers can't show text inside `progress`
- Use `--size` to set size (default 5rem) and `--thickness` to set indicator thickness

### menu

Menu is used to display a list of links vertically or horizontally

```html
<ul class="menu {MODIFIER}">
	<li><button>Item</button></li>
	<!-- more items -->
</ul>
```

- part: `menu-title`, `menu-dropdown`, `menu-dropdown-toggle`
- modifier: `menu-disabled`, `menu-active`, `menu-focus`, `menu-dropdown-show`
- size: `menu-xs`, `menu-sm`, `menu-md`, `menu-lg`, `menu-xl`
- direction: `menu-vertical`, `menu-horizontal`
- {MODIFIER} is optional and can have one of the modifier/size/direction class names
- Use `lg:menu-horizontal` for responsive layouts
- Use `menu-title` for list item title
- Use `<details>` to make submenus collapsible
- Use `menu-dropdown` and `menu-dropdown-toggle` to toggle dropdowns using JS

### loading

Loading shows an animation to indicate that something is loading

```html
<span class="loading {MODIFIER}"></span>
```

- style: `loading-spinner`, `loading-dots`, `loading-ring`, `loading-ball`, `loading-bars`, `loading-infinity`
- size: `loading-xs`, `loading-sm`, `loading-md`, `loading-lg`, `loading-xl`
- {MODIFIER} is optional and can have one of the style/size class names

### input

Text input is a simple input field

```html
<input type="{type}" placeholder="Type here" class="input {MODIFIER}" />
```

- style: `input-ghost`
- color: `input-neutral`, `input-primary`, `input-secondary`, `input-accent`, `input-info`, `input-success`, `input-warning`, `input-error`
- size: `input-xs`, `input-sm`, `input-md`, `input-lg`, `input-xl`
- {MODIFIER} is optional and can have one of each style/color/size class names
- Can be used with any input type (text, password, email, etc.)
- Use `input` class on a wrapper when you have more than one element inside the control

### fieldset

Fieldset groups related form elements with a title and description

```html
<fieldset class="fieldset">
	<legend class="fieldset-legend">{title}</legend>
	{CONTENT}
	<p class="label">{description}</p>
</fieldset>
```

- part: `fieldset-legend`
- related: `label` for descriptions
- You can use any element as a direct child of `fieldset`

### dropdown

Dropdown opens a menu or any element when the button is clicked

```html
<div class="dropdown {MODIFIER}">
	<div tabindex="0" role="button">Button</div>
	<ul tabindex="0" class="dropdown-content">
		{CONTENT}
	</ul>
</div>
```

- part: `dropdown-content`
- placement: `dropdown-start`, `dropdown-center`, `dropdown-end`, `dropdown-top`, `dropdown-bottom`, `dropdown-left`, `dropdown-right`
- modifier: `dropdown-hover`, `dropdown-open`
- {MODIFIER} is optional and can have one of the modifier/placement class names
- You can also implement using `<details>`/`<summary>` or the Popover API
- For CSS-focus dropdowns, use `tabindex="0"` and `role="button"` on the trigger
- Content can be any HTML element (not just `<ul>`)

### divider

Divider separates content vertically or horizontally

```html
<div class="divider {MODIFIER}">{text}</div>
```

- color: `divider-neutral`, `divider-primary`, `divider-secondary`, `divider-accent`, `divider-success`, `divider-warning`, `divider-info`, `divider-error`
- direction: `divider-vertical`, `divider-horizontal`
- placement: `divider-start`, `divider-end`
- {MODIFIER} is optional and can have one of each direction/color/placement class names
- Omit text for a blank divider

### countdown

Countdown gives a transition effect when you change a number between 0 and 99

```html
<span class="countdown">
	<span style="--value:{number};">{number}</span>
</span>
```

- The `--value` CSS variable and text must be a number between 0 and 99
- Update the inner text and `--value` using JS
- Add `aria-live="polite"` and `aria-label="{number}"` so screen readers can read changes

### checkbox

Checkboxes are used to select or deselect a value

```html
<input type="checkbox" class="checkbox {MODIFIER}" />
```

- color: `checkbox-primary`, `checkbox-secondary`, `checkbox-accent`, `checkbox-neutral`, `checkbox-success`, `checkbox-warning`, `checkbox-info`, `checkbox-error`
- size: `checkbox-xs`, `checkbox-sm`, `checkbox-md`, `checkbox-lg`, `checkbox-xl`
- {MODIFIER} is optional and can have one of each color/size class names

### card

Cards are used to group and display content

```html
<div class="card {MODIFIER}">
	<figure><img src="{image-url}" alt="{alt-text}" /></figure>
	<div class="card-body">
		<h2 class="card-title">{title}</h2>
		<p>{CONTENT}</p>
		<div class="card-actions">{actions}</div>
	</div>
</div>
```

- part: `card-title`, `card-body`, `card-actions`
- style: `card-border`, `card-dash`
- modifier: `card-side`, `image-full`
- size: `card-xs`, `card-sm`, `card-md`, `card-lg`, `card-xl`
- {MODIFIER} is optional and can have one of the modifier and size class names
- `<figure>` and `<div class="card-body">` are optional
- Use `sm:card-horizontal` for responsive layouts
- If the image is placed after `card-body`, it will be at the bottom

### button

Buttons allow the user to take actions

```html
<button class="btn {MODIFIER}">Button</button>
```

- color: `btn-neutral`, `btn-primary`, `btn-secondary`, `btn-accent`, `btn-info`, `btn-success`, `btn-warning`, `btn-error`
- style: `btn-outline`, `btn-dash`, `btn-soft`, `btn-ghost`, `btn-link`
- behavior: `btn-active`, `btn-disabled`
- size: `btn-xs`, `btn-sm`, `btn-md`, `btn-lg`, `btn-xl`
- modifier: `btn-wide`, `btn-block`, `btn-square`, `btn-circle`
- {MODIFIER} is optional and can have one of each color/style/behavior/size/modifier class names
- btn can be used on any html tags such as `<button>`, `<a>`, `<input>`
- btn can have an icon before or after the text
- set `tabindex="-1" role="button" aria-disabled="true"` if you want to disable the button using a class name

### badge

Badges are used to inform the user of the status of specific data

```html
<span class="badge {MODIFIER}">Badge</span>
```

- style: `badge-outline`, `badge-dash`, `badge-soft`, `badge-ghost`
- color: `badge-neutral`, `badge-primary`, `badge-secondary`, `badge-accent`, `badge-info`, `badge-success`, `badge-warning`, `badge-error`
- size: `badge-xs`, `badge-sm`, `badge-md`, `badge-lg`, `badge-xl`
- {MODIFIER} is optional and can have one of each style/color/size class names
- Can be used inside text or buttons
- To create an empty badge, just remove the text between the span tags

### alert

Alert informs users about important events

```html
<div role="alert" class="alert {MODIFIER}">{CONTENT}</div>
```

- style: `alert-outline`, `alert-dash`, `alert-soft`
- color: `alert-info`, `alert-success`, `alert-warning`, `alert-error`
- direction: `alert-vertical`, `alert-horizontal`
- {MODIFIER} is optional and can have one of each style/color/direction class names
- Add `sm:alert-horizontal` for responsive layouts
