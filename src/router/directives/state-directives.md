/\*\*

- `ng-sref`: A directive for linking to a state
-
- A directive which links to a state (and optionally, parameters).
- When clicked, this directive activates the linked state with the supplied parameter values.
-
- ### Linked State
- The attribute value of the `ng-sref` is the name of the state to link to.
-
- #### Example:
- This will activate the `home` state when the link is clicked.
- ```html

  ```

- <a ng-sref="home">Home</a>
- ```

  ```

-
- ### Relative Links
- You can also use relative state paths within `ng-sref`, just like a relative path passed to `$state.go()` ([[StateService.go]]).
- You just need to be aware that the path is relative to the state that _created_ the link.
- This allows a state to create a relative `ng-sref` which always targets the same destination.
-
- #### Example:
- Both these links are relative to the parent state, even when a child state is currently active.
- ```html

  ```

- <a ng-sref=".child1">child 1 state</a>
- <a ng-sref=".child2">child 2 state</a>
- ```

  ```

-
- This link activates the parent state.
- ```html

  ```

- <a ng-sref="^">Return</a>
- ```

  ```

-
- ### hrefs
- If the linked state has a URL, the directive will automatically generate and
- update the `href` attribute (using the [[StateService.href]] method).
-
- #### Example:
- Assuming the `users` state has a url of `/users/`
- ```html

  ```

- <a ng-sref="users" href="/users/">Users</a>
- ```

  ```

-
- ### Parameter Values
- In addition to the state name, a `ng-sref` can include parameter values which are applied when activating the state.
- Param values can be provided in the `ng-sref` value after the state name, enclosed by parentheses.
- The content inside the parentheses is an expression, evaluated to the parameter values.
-
- #### Example:
- This example renders a list of links to users.
- The state's `userId` parameter value comes from each user's `user.id` property.
- ```html

  ```

- <li ng-repeat="user in users">
- <a ng-sref="users.detail({ userId: user.id })">{{ user.displayName }}</a>
- </li>
- ```

  ```

-
- Note:
- The parameter values expression is `$watch`ed for updates.
-
- ### Transition Options
- You can specify [[TransitionOptions]] to pass to [[StateService.go]] by using the `ng-sref-opts` attribute.
- Options are restricted to `location`, `inherit`, and `reload`.
-
- #### Example:
- ```html

  ```

- <a ng-sref="home" ng-sref-opts="{ reload: true }">Home</a>
- ```

  ```

-
- ### Other DOM Events
-
- You can also customize which DOM events to respond to (instead of `click`) by
- providing an `events` array in the `ng-sref-opts` attribute.
-
- #### Example:
- ```html

  ```

- <input type="text" ng-sref="contacts" ng-sref-opts="{ events: ['change', 'blur'] }">
- ```

  ```

-
- ### Highlighting the active link
- This directive can be used in conjunction with [[ngSrefActive]] to highlight the active link.
-
- ### Examples
- If you have the following template:
-
- ```html

  ```

- <a ng-sref="home">Home</a>
- <a ng-sref="about">About</a>
- <a ng-sref="{page: 2}">Next page</a>
-
- <ul>
-     <li ng-repeat="contact in contacts">
-         <a ng-sref="contacts.detail({ id: contact.id })">{{ contact.name }}</a>
-     </li>
- </ul>
- ```

  ```

-
- Then (assuming the current state is `contacts`) the rendered html including hrefs would be:
-
- ```html

  ```

- <a href="#/home" ng-sref="home">Home</a>
- <a href="#/about" ng-sref="about">About</a>
- <a href="#/contacts?page=2" ng-sref="{page: 2}">Next page</a>
-
- <ul>
-     <li ng-repeat="contact in contacts">
-         <a href="#/contacts/1" ng-sref="contacts.detail({ id: contact.id })">Joe</a>
-     </li>
-     <li ng-repeat="contact in contacts">
-         <a href="#/contacts/2" ng-sref="contacts.detail({ id: contact.id })">Alice</a>
-     </li>
-     <li ng-repeat="contact in contacts">
-         <a href="#/contacts/3" ng-sref="contacts.detail({ id: contact.id })">Bob</a>
-     </li>
- </ul>
-
- <a href="#/home" ng-sref="home" ng-sref-opts="{reload: true}">Home</a>
- ```

  ```

-
- ### Notes
-
- - You can use `ng-sref` to change **only the parameter values** by omitting the state name and parentheses.
- #### Example:
- Sets the `lang` parameter to `en` and remains on the same state.
-
- ```html

  ```

- <a ng-sref="{ lang: 'en' }">English</a>
- ```

  ```

-
- - A middle-click, right-click, or ctrl-click is handled (natively) by the browser to open the href in a new window, for example.
-
- - Unlike the parameter values expression, the state name is not `$watch`ed (for performance reasons).
- If you need to dynamically update the state being linked to, use the fully dynamic [[ngState]] directive.
  \*/

/\*\*

- `ng-state`: A fully dynamic directive for linking to a state
-
- A directive which links to a state (and optionally, parameters).
- When clicked, this directive activates the linked state with the supplied parameter values.
-
- **This directive is very similar to [[ngSref]], but it observes attributes and watches/evaluates all its inputs.**
-
- A directive which links to a state (and optionally, parameters).
- When clicked, this directive activates the linked state with the supplied parameter values.
-
- ### Linked State
- The attribute value of `ng-state` is an expression which is `$watch`ed and evaluated as the state to link to.
- **This is in contrast with `ng-sref`, which takes a state name as a string literal.**
-
- #### Example:
- Create a list of links.
- ```html

  ```

- <li ng-repeat="link in navlinks">
- <a ng-state="link.state">{{ link.displayName }}</a>
- </li>
- ```

  ```

-
- ### Relative Links
- If the expression evaluates to a relative path, it is processed like [[ngSref]].
- You just need to be aware that the path is relative to the state that _created_ the link.
- This allows a state to create relative `ng-state` which always targets the same destination.
-
- ### hrefs
- If the linked state has a URL, the directive will automatically generate and
- update the `href` attribute (using the [[StateService.href]] method).
-
- ### Parameter Values
- In addition to the state name expression, a `ng-state` can include parameter values which are applied when activating the state.
- Param values should be provided using the `ng-state-params` attribute.
- The `ng-state-params` attribute value is `$watch`ed and evaluated as an expression.
-
- #### Example:
- This example renders a list of links with param values.
- The state's `userId` parameter value comes from each user's `user.id` property.
- ```html

  ```

- <li ng-repeat="link in navlinks">
- <a ng-state="link.state" ng-state-params="link.params">{{ link.displayName }}</a>
- </li>
- ```

  ```

-
- ### Transition Options
- You can specify [[TransitionOptions]] to pass to [[StateService.go]] by using the `ng-state-opts` attribute.
- Options are restricted to `location`, `inherit`, and `reload`.
- The value of the `ng-state-opts` is `$watch`ed and evaluated as an expression.
-
- #### Example:
- ```html

  ```

- <a ng-state="returnto.state" ng-state-opts="{ reload: true }">Home</a>
- ```

  ```

-
- ### Other DOM Events
-
- You can also customize which DOM events to respond to (instead of `click`) by
- providing an `events` array in the `ng-state-opts` attribute.
-
- #### Example:
- ```html

  ```

- <input type="text" ng-state="contacts" ng-state-opts="{ events: ['change', 'blur'] }">
- ```

  ```

-
- ### Highlighting the active link
- This directive can be used in conjunction with [[ngSrefActive]] to highlight the active link.
-
- ### Notes
-
- - You can use `ng-params` to change **only the parameter values** by omitting the state name and supplying only `ng-state-params`.
- However, it might be simpler to use [[ngSref]] parameter-only links.
-
- #### Example:
- Sets the `lang` parameter to `en` and remains on the same state.
-
- ```html

  ```

- <a ng-state="" ng-state-params="{ lang: 'en' }">English</a>
- ```

  ```

-
- - A middle-click, right-click, or ctrl-click is handled (natively) by the browser to open the href in a new window, for example.
- ```
  */
  ```

/\*\*

- `ng-sref-active` and `ng-sref-active-eq`: A directive that adds a CSS class when a `ng-sref` is active
-
- A directive working alongside [[ngSref]] and [[ngState]] to add classes to an element when the
- related directive's state is active (and remove them when it is inactive).
-
- The primary use-case is to highlight the active link in navigation menus,
- distinguishing it from the inactive menu items.
-
- ### Linking to a `ng-sref` or `ng-state`
- `ng-sref-active` can live on the same element as `ng-sref`/`ng-state`, or it can be on a parent element.
- If a `ng-sref-active` is a parent to more than one `ng-sref`/`ng-state`, it will apply the CSS class when **any of the links are active**.
-
- ### Matching
-
- The `ng-sref-active` directive applies the CSS class when the `ng-sref`/`ng-state`'s target state **or any child state is active**.
- This is a "fuzzy match" which uses [[StateService.includes]].
-
- The `ng-sref-active-eq` directive applies the CSS class when the `ng-sref`/`ng-state`'s target state is directly active (not when child states are active).
- This is an "exact match" which uses [[StateService.is]].
-
- ### Parameter values
- If the `ng-sref`/`ng-state` includes parameter values, the current parameter values must match the link's values for the link to be highlighted.
- This allows a list of links to the same state with different parameters to be rendered, and the correct one highlighted.
-
- #### Example:
- ```html

  ```

- <li ng-repeat="user in users" ng-sref-active="active">
- <a ng-sref="user.details({ userId: user.id })">{{ user.lastName }}</a>
- </li>
- ```

  ```

-
- ### Examples
-
- Given the following template:
- #### Example:
- ```html

  ```

- <ul>
- <li ng-sref-active="active" class="item">
-     <a href ng-sref="app.user({user: 'bilbobaggins'})">@bilbobaggins</a>
- </li>
- </ul>
- ```

  ```

-
- When the app state is `app.user` (or any child state),
- and contains the state parameter "user" with value "bilbobaggins",
- the resulting HTML will appear as (note the 'active' class):
-
- ```html

  ```

- <ul>
- <li ng-sref-active="active" class="item active">
-     <a ng-sref="app.user({user: 'bilbobaggins'})" href="/users/bilbobaggins">@bilbobaggins</a>
- </li>
- </ul>
- ```

  ```

-
- ### Glob mode
-
- It is possible to pass `ng-sref-active` an expression that evaluates to an object.
- The objects keys represent active class names and values represent the respective state names/globs.
- `ng-sref-active` will match if the current active state **includes** any of
- the specified state names/globs, even the abstract ones.
-
- #### Example:
- Given the following template, with "admin" being an abstract state:
- ```html

  ```

- <div ng-sref-active="{'active': 'admin.**'}">
- <a ng-sref-active="active" ng-sref="admin.roles">Roles</a>
- </div>
- ```

  ```

-
- Arrays are also supported as values in the `ngClass`-like interface.
- This allows multiple states to add `active` class.
-
- #### Example:
- Given the following template, with "admin.roles" being the current state, the class will be added too:
- ```html

  ```

- <div ng-sref-active="{'active': ['owner.**', 'admin.**']}">
- <a ng-sref-active="active" ng-sref="admin.roles">Roles</a>
- </div>
- ```

  ```

-
- When the current state is "admin.roles" the "active" class will be applied to both the `<div>` and `<a>` elements.
- It is important to note that the state names/globs passed to `ng-sref-active` override any state provided by a linked `ng-sref`.
-
- ### Notes:
-
- - The class name is interpolated **once** during the directives link time (any further changes to the
- interpolated value are ignored).
-
- - Multiple classes may be specified in a space-separated format: `ng-sref-active='class1 class2 class3'`
    \*/
