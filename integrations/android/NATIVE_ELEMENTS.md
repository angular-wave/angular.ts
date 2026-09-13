# Native Element Catalog

This file is generated from `native-elements.json`. Edit the catalog and run
`make -C integrations/android generate-native-elements`.

## `text-field`

Category: `input`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-input`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `value` | `string` | no | `` |
| `placeholder` | `string` | no | `` |
| `enabled` | `boolean` | no | `true` |
| `required` | `boolean` | no | `false` |
| `error` | `string` | no | `` |
| `keyboardType` | `string` | no | `text` |
| `imeAction` | `string` | no | `done` |
| `autofillHints` | `string_list` | no | none |
| `selectionStart` | `integer` | no | none |
| `selectionEnd` | `integer` | no | none |
| `readOnly` | `boolean` | no | `false` |
| `pending` | `boolean` | no | `false` |

Methods: `focus`, `blur`

Events: `change`, `focus`, `blur`, `submit`

Accessibility role: `textbox`; label property:
`label`.

## `search-field`

Category: `input`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-search`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `Search` |
| `value` | `string` | no | `` |
| `placeholder` | `string` | no | `` |
| `enabled` | `boolean` | no | `true` |
| `required` | `boolean` | no | `false` |
| `error` | `string` | no | `` |
| `keyboardType` | `string` | no | `search` |
| `imeAction` | `string` | no | `search` |
| `autofillHints` | `string_list` | no | none |
| `selectionStart` | `integer` | no | none |
| `selectionEnd` | `integer` | no | none |
| `readOnly` | `boolean` | no | `false` |
| `pending` | `boolean` | no | `false` |

Methods: `focus`, `blur`

Events: `change`, `focus`, `blur`, `submit`

Accessibility role: `searchbox`; label property:
`label`.

## `checkbox`

Category: `input`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-checkbox`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `value` | `boolean` | no | `false` |
| `enabled` | `boolean` | no | `true` |
| `required` | `boolean` | no | `false` |
| `error` | `string` | no | `` |
| `pending` | `boolean` | no | `false` |

Methods: None.

Events: `change`, `focus`, `blur`

Accessibility role: `checkbox`; label property:
`label`.

## `switch`

Category: `input`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-switch`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `value` | `boolean` | no | `false` |
| `enabled` | `boolean` | no | `true` |
| `required` | `boolean` | no | `false` |
| `error` | `string` | no | `` |
| `pending` | `boolean` | no | `false` |

Methods: None.

Events: `change`, `focus`, `blur`

Accessibility role: `switch`; label property:
`label`.

## `slider`

Category: `input`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-slider`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `value` | `float` | no | `0` |
| `min` | `float` | no | `0` |
| `max` | `float` | no | `100` |
| `step` | `float` | no | `0` |
| `enabled` | `boolean` | no | `true` |
| `required` | `boolean` | no | `false` |
| `error` | `string` | no | `` |
| `pending` | `boolean` | no | `false` |

Methods: None.

Events: `change`, `focus`, `blur`

Accessibility role: `slider`; label property:
`label`.

## `text`

Category: `display`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: None.

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `text` | `string` | no | `` |
| `color` | `color` | no | none |
| `textSize` | `float` | no | `16` |
| `maxLines` | `integer` | no | `2147483647` |

Methods: None.

Events: None.

Accessibility role: `text`; label property:
`text`.

## `button`

Category: `action`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: `native-button`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `text` | `string` | no | `Button` |
| `enabled` | `boolean` | no | `true` |
| `loading` | `boolean` | no | `false` |
| `loadingText` | `string` | no | `Loading` |

Methods: None.

Events: `click`, `longClick`, `focus`, `blur`

Accessibility role: `button`; label property:
`text`.

## `icon`

Category: `display`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: `native-icon`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `resource` | `string` | no | `ic_menu_help` |
| `contentDescription` | `string` | no | `` |
| `tint` | `color` | no | none |

Methods: None.

Events: None.

Accessibility role: `image`; label property:
`contentDescription`.

## `divider`

Category: `display`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: None.

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `color` | `color` | no | `#1f000000` |
| `thickness` | `float` | no | `1` |

Methods: None.

Events: None.

Accessibility role: `separator`; label property:
`label`.

## `badge`

Category: `display`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: None.

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `text` | `string` | no | `` |
| `backgroundColor` | `color` | no | `#b3261e` |
| `textColor` | `color` | no | `#ffffff` |

Methods: None.

Events: None.

Accessibility role: `text`; label property:
`text`.

## `chip`

Category: `action`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: None.

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `text` | `string` | no | `Chip` |
| `enabled` | `boolean` | no | `true` |
| `checkable` | `boolean` | no | `false` |
| `checked` | `boolean` | no | `false` |

Methods: None.

Events: `click`, `change`, `focus`, `blur`

Accessibility role: `button`; label property:
`text`.

## `progress`

Category: `display`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: `progress-bar`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `Progress` |
| `value` | `integer` | no | `0` |
| `max` | `integer` | no | `100` |
| `indeterminate` | `boolean` | no | `false` |

Methods: None.

Events: None.

Accessibility role: `progressbar`; label property:
`label`.

## `loading-indicator`

Category: `display`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: `spinner`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `Loading` |
| `visible` | `boolean` | no | `true` |

Methods: None.

Events: None.

Accessibility role: `progressbar`; label property:
`label`.

## `floating-action-button`

Category: `action`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: `fab`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `resource` | `string` | no | `ic_input_add` |
| `contentDescription` | `string` | no | `Action` |
| `enabled` | `boolean` | no | `true` |

Methods: None.

Events: `click`, `longClick`, `focus`, `blur`

Accessibility role: `button`; label property:
`contentDescription`.

## `card`

Category: `display`. Maturity: `experimental`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: `native-card`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `title` | `string` | no | `Native card` |
| `text` | `string` | no | `` |
| `enabled` | `boolean` | no | `true` |

Methods: None.

Events: `click`, `longClick`, `focus`, `blur`

Accessibility role: `button`; label property:
`title`.

## `image`

Category: `display`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: `native-image`, `img`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `src` | `string` | no | `` |
| `contentDescription` | `string` | no | `Native image` |
| `contentScale` | `string` | no | `crop` |
| `width` | `float` | no | none |
| `height` | `float` | no | none |
| `minWidth` | `float` | no | `0` |
| `minHeight` | `float` | no | `0` |
| `enabled` | `boolean` | no | `true` |
| `placeholderColor` | `color` | no | `#607d8b` |
| `errorColor` | `color` | no | `#b3261e` |

Methods: None.

Events: `load`, `error`, `click`, `longClick`, `focus`, `blur`

Accessibility role: `image`; label property:
`contentDescription`.

## `drawer`

Category: `overlay`. Maturity: `experimental`. Minimum SDK:
`28`. State ownership: `destination`.

Aliases: `compose-drawer`, `native-drawer`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `text` | `string` | no | `Open drawer` |
| `items` | `json` | no | none |

Methods: `show`, `hide`, `dismiss`

Events: `open`, `close`, `select`

Accessibility role: `button`; label property:
`text`.

## `radio-group`

Category: `input`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-radio-group`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `value` | `string` | no | `` |
| `options` | `json` | yes | none |
| `enabled` | `boolean` | no | `true` |
| `required` | `boolean` | no | `false` |
| `error` | `string` | no | `` |
| `pending` | `boolean` | no | `false` |

Methods: None.

Events: `change`, `focus`, `blur`

Accessibility role: `radiogroup`; label property:
`label`.

## `range-slider`

Category: `input`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-range`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `Range` |
| `value` | `json` | yes | none |
| `min` | `float` | no | `0` |
| `max` | `float` | no | `100` |
| `step` | `float` | no | `0` |
| `enabled` | `boolean` | no | `true` |
| `required` | `boolean` | no | `false` |
| `error` | `string` | no | `` |
| `pending` | `boolean` | no | `false` |

Methods: None.

Events: `change`, `focus`, `blur`

Accessibility role: `slider`; label property:
`label`.

## `date-picker`

Category: `input`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-date`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `Date` |
| `value` | `string` | no | `` |
| `enabled` | `boolean` | no | `true` |
| `required` | `boolean` | no | `false` |
| `error` | `string` | no | `` |
| `pending` | `boolean` | no | `false` |

Methods: None.

Events: `change`, `focus`, `blur`

Accessibility role: `date`; label property:
`label`.

## `time-picker`

Category: `input`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-time`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `Time` |
| `value` | `string` | no | `` |
| `enabled` | `boolean` | no | `true` |
| `required` | `boolean` | no | `false` |
| `error` | `string` | no | `` |
| `pending` | `boolean` | no | `false` |

Methods: None.

Events: `change`, `focus`, `blur`

Accessibility role: `time`; label property:
`label`.

## `file-picker`

Category: `input`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-file`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `Choose file` |
| `text` | `string` | no | `Choose file` |
| `value` | `json` | no | none |
| `accept` | `string_list` | no | none |
| `multiple` | `boolean` | no | `false` |
| `enabled` | `boolean` | no | `true` |
| `required` | `boolean` | no | `false` |
| `error` | `string` | no | `` |
| `pending` | `boolean` | no | `false` |

Methods: `open`

Events: `request`, `change`, `cancel`, `focus`, `blur`

Accessibility role: `button`; label property:
`label`.

## `row`

Category: `layout`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-row`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `children` | `json` | no | none |
| `padding` | `float` | no | `0` |
| `width` | `float` | no | none |
| `height` | `float` | no | none |
| `minWidth` | `float` | no | `0` |
| `minHeight` | `float` | no | `0` |
| `spacing` | `float` | no | `0` |
| `horizontalAlignment` | `string` | no | `stretch` |
| `verticalAlignment` | `string` | no | `stretch` |
| `enabled` | `boolean` | no | `true` |
| `swipeEnabled` | `boolean` | no | `false` |
| `reorderEnabled` | `boolean` | no | `false` |
| `safeArea` | `boolean` | no | `false` |

Methods: None.

Events: `childEvent`

Accessibility role: `group`; label property:
`label`.

## `column`

Category: `layout`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-column`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `children` | `json` | no | none |
| `padding` | `float` | no | `0` |
| `width` | `float` | no | none |
| `height` | `float` | no | none |
| `minWidth` | `float` | no | `0` |
| `minHeight` | `float` | no | `0` |
| `spacing` | `float` | no | `0` |
| `horizontalAlignment` | `string` | no | `stretch` |
| `verticalAlignment` | `string` | no | `stretch` |
| `enabled` | `boolean` | no | `true` |
| `swipeEnabled` | `boolean` | no | `false` |
| `reorderEnabled` | `boolean` | no | `false` |
| `safeArea` | `boolean` | no | `false` |

Methods: None.

Events: `childEvent`

Accessibility role: `group`; label property:
`label`.

## `box`

Category: `layout`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-box`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `children` | `json` | no | none |
| `padding` | `float` | no | `0` |
| `width` | `float` | no | none |
| `height` | `float` | no | none |
| `minWidth` | `float` | no | `0` |
| `minHeight` | `float` | no | `0` |
| `horizontalAlignment` | `string` | no | `stretch` |
| `verticalAlignment` | `string` | no | `stretch` |
| `enabled` | `boolean` | no | `true` |
| `safeArea` | `boolean` | no | `false` |

Methods: None.

Events: `childEvent`

Accessibility role: `group`; label property:
`label`.

## `surface`

Category: `layout`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-surface`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `children` | `json` | no | none |
| `padding` | `float` | no | `0` |
| `width` | `float` | no | none |
| `height` | `float` | no | none |
| `minWidth` | `float` | no | `0` |
| `minHeight` | `float` | no | `0` |
| `horizontalAlignment` | `string` | no | `stretch` |
| `verticalAlignment` | `string` | no | `stretch` |
| `enabled` | `boolean` | no | `true` |
| `backgroundColor` | `color` | no | `#00000000` |
| `safeArea` | `boolean` | no | `false` |

Methods: None.

Events: `childEvent`

Accessibility role: `group`; label property:
`label`.

## `scroll`

Category: `layout`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-scroll`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `children` | `json` | no | none |
| `padding` | `float` | no | `0` |
| `width` | `float` | no | none |
| `height` | `float` | no | none |
| `minWidth` | `float` | no | `0` |
| `minHeight` | `float` | no | `0` |
| `spacing` | `float` | no | `0` |
| `horizontalAlignment` | `string` | no | `stretch` |
| `verticalAlignment` | `string` | no | `stretch` |
| `enabled` | `boolean` | no | `true` |
| `safeArea` | `boolean` | no | `false` |

Methods: `scrollTo`, `scrollToStart`, `scrollToEnd`

Events: `childEvent`, `scroll`

Accessibility role: `group`; label property:
`label`.

## `scaffold`

Category: `layout`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-scaffold`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `children` | `json` | no | none |
| `padding` | `float` | no | `0` |
| `width` | `float` | no | none |
| `height` | `float` | no | none |
| `minWidth` | `float` | no | `0` |
| `minHeight` | `float` | no | `0` |
| `spacing` | `float` | no | `0` |
| `horizontalAlignment` | `string` | no | `stretch` |
| `verticalAlignment` | `string` | no | `stretch` |
| `enabled` | `boolean` | no | `true` |
| `safeArea` | `boolean` | no | `true` |

Methods: None.

Events: `childEvent`

Accessibility role: `group`; label property:
`label`.

## `app-bar`

Category: `navigation`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-app-bar`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `children` | `json` | no | none |
| `padding` | `float` | no | `0` |
| `width` | `float` | no | none |
| `height` | `float` | no | none |
| `minWidth` | `float` | no | `0` |
| `minHeight` | `float` | no | `0` |
| `spacing` | `float` | no | `0` |
| `horizontalAlignment` | `string` | no | `stretch` |
| `verticalAlignment` | `string` | no | `stretch` |
| `enabled` | `boolean` | no | `true` |
| `safeArea` | `boolean` | no | `false` |

Methods: None.

Events: `childEvent`

Accessibility role: `group`; label property:
`label`.

## `bottom-bar`

Category: `navigation`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-bottom-bar`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `items` | `json` | no | none |
| `selectedKey` | `string` | no | `` |
| `width` | `float` | no | none |
| `height` | `float` | no | none |
| `minWidth` | `float` | no | `0` |
| `minHeight` | `float` | no | `0` |
| `enabled` | `boolean` | no | `true` |
| `safeArea` | `boolean` | no | `false` |

Methods: None.

Events: `select`, `reselect`

Accessibility role: `group`; label property:
`label`.

## `navigation-rail`

Category: `navigation`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-navigation-rail`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `children` | `json` | no | none |
| `padding` | `float` | no | `0` |
| `width` | `float` | no | none |
| `height` | `float` | no | none |
| `minWidth` | `float` | no | `0` |
| `minHeight` | `float` | no | `0` |
| `spacing` | `float` | no | `0` |
| `horizontalAlignment` | `string` | no | `stretch` |
| `verticalAlignment` | `string` | no | `stretch` |
| `enabled` | `boolean` | no | `true` |
| `safeArea` | `boolean` | no | `false` |

Methods: None.

Events: `childEvent`

Accessibility role: `group`; label property:
`label`.

## `tabs`

Category: `navigation`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-tabs`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `children` | `json` | no | none |
| `padding` | `float` | no | `0` |
| `width` | `float` | no | none |
| `height` | `float` | no | none |
| `minWidth` | `float` | no | `0` |
| `minHeight` | `float` | no | `0` |
| `enabled` | `boolean` | no | `true` |
| `value` | `string` | no | `` |
| `safeArea` | `boolean` | no | `false` |

Methods: `scrollTo`

Events: `childEvent`, `change`

Accessibility role: `group`; label property:
`label`.

## `pager`

Category: `navigation`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-pager`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `children` | `json` | no | none |
| `padding` | `float` | no | `0` |
| `width` | `float` | no | none |
| `height` | `float` | no | none |
| `minWidth` | `float` | no | `0` |
| `minHeight` | `float` | no | `0` |
| `enabled` | `boolean` | no | `true` |
| `value` | `integer` | no | `0` |
| `safeArea` | `boolean` | no | `false` |

Methods: `scrollTo`

Events: `childEvent`, `change`

Accessibility role: `group`; label property:
`label`.

## `list`

Category: `collection`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-list`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `children` | `json` | no | none |
| `padding` | `float` | no | `0` |
| `enabled` | `boolean` | no | `true` |
| `safeArea` | `boolean` | no | `false` |

Methods: `scrollTo`, `scrollToStart`, `scrollToEnd`

Events: `childEvent`, `scroll`, `loadMore`, `swipe`, `move`

Accessibility role: `list`; label property:
`label`.

## `grid`

Category: `collection`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-grid`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `children` | `json` | no | none |
| `padding` | `float` | no | `0` |
| `enabled` | `boolean` | no | `true` |
| `columns` | `integer` | no | `2` |
| `swipeEnabled` | `boolean` | no | `false` |
| `reorderEnabled` | `boolean` | no | `false` |
| `safeArea` | `boolean` | no | `false` |

Methods: `scrollTo`, `scrollToStart`, `scrollToEnd`

Events: `childEvent`, `scroll`, `loadMore`, `swipe`, `move`

Accessibility role: `list`; label property:
`label`.

## `list-item`

Category: `collection`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: `native-list-item`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `text` | `string` | no | `` |
| `supportingText` | `string` | no | `` |
| `selected` | `boolean` | no | `false` |
| `enabled` | `boolean` | no | `true` |

Methods: None.

Events: `click`, `longClick`

Accessibility role: `listitem`; label property:
`label`.

## `swipe-action`

Category: `collection`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: `native-swipe-action`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `Action` |
| `text` | `string` | no | `Action` |
| `enabled` | `boolean` | no | `true` |

Methods: None.

Events: `action`

Accessibility role: `button`; label property:
`label`.

## `pull-to-refresh`

Category: `collection`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-pull-to-refresh`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `` |
| `children` | `json` | no | none |
| `padding` | `float` | no | `0` |
| `enabled` | `boolean` | no | `true` |
| `refreshing` | `boolean` | no | `false` |
| `safeArea` | `boolean` | no | `false` |

Methods: None.

Events: `childEvent`, `refresh`

Accessibility role: `list`; label property:
`label`.

## `dialog`

Category: `overlay`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `destination`.

Aliases: `native-dialog`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `text` | `string` | no | `` |
| `title` | `string` | no | `` |
| `message` | `string` | no | `` |
| `enabled` | `boolean` | no | `true` |
| `confirmText` | `string` | no | `OK` |
| `cancelText` | `string` | no | `Cancel` |

Methods: `show`, `hide`, `dismiss`

Events: `show`, `confirm`, `cancel`, `dismiss`

Accessibility role: `dialog`; label property:
`title`.

## `bottom-sheet`

Category: `overlay`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `destination`.

Aliases: `native-bottom-sheet`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `text` | `string` | no | `` |
| `title` | `string` | no | `` |
| `message` | `string` | no | `` |
| `enabled` | `boolean` | no | `true` |

Methods: `show`, `hide`, `dismiss`

Events: `show`, `cancel`, `dismiss`

Accessibility role: `bottom-sheet`; label property:
`title`.

## `menu`

Category: `overlay`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: `native-menu`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `text` | `string` | no | `` |
| `title` | `string` | no | `` |
| `message` | `string` | no | `` |
| `enabled` | `boolean` | no | `true` |
| `items` | `json` | yes | none |

Methods: `show`, `hide`, `dismiss`

Events: `show`, `select`, `dismiss`

Accessibility role: `menu`; label property:
`title`.

## `snackbar`

Category: `overlay`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: `native-snackbar`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `text` | `string` | no | `` |
| `title` | `string` | no | `` |
| `message` | `string` | no | `` |
| `enabled` | `boolean` | no | `true` |
| `actionText` | `string` | no | `` |
| `indefinite` | `boolean` | no | `false` |

Methods: `show`, `hide`, `dismiss`

Events: `show`, `action`, `dismiss`

Accessibility role: `snackbar`; label property:
`title`.

## `tooltip`

Category: `overlay`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `none`.

Aliases: `native-tooltip`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | no | `Help` |
| `text` | `string` | no | `Help` |
| `message` | `string` | no | `` |

Methods: `show`, `hide`, `dismiss`

Events: `show`, `dismiss`

Accessibility role: `tooltip`; label property:
`label`.

## `map`

Category: `media`. Maturity: `preview`. Minimum SDK:
`28`. State ownership: `element`.

Aliases: `native-map`

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `latitude` | `float` | no | `0` |
| `longitude` | `float` | no | `0` |
| `zoom` | `float` | no | `12` |
| `mapType` | `string` | no | `normal` |
| `traffic` | `boolean` | no | `false` |
| `userLocation` | `boolean` | no | `false` |
| `markers` | `json` | no | none |
| `contentDescription` | `string` | no | `Map` |

Methods: `move`, `animate`, `fitMarkers`

Events: `ready`, `cameraChange`, `markerClick`, `mapClick`

Accessibility role: `map`; label property:
`contentDescription`.
