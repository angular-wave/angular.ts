---
title: 'Web basics used in these docs'
linkTitle: 'Web basics'
weight: 5
description:
  'Learn the minimum HTML, JavaScript, DOM, and browser-tool vocabulary needed
  to follow the AngularTS tutorials.'
---

## What you will learn

You will learn what a web page contains, how JavaScript changes it, and how to
open a page and inspect errors. Skip this page if those ideas are familiar.

## Before you start

Install a text editor and a current web browser. Create an empty folder for the
tutorial files.

## HTML describes a page

HTML is text that describes elements such as headings, inputs, and buttons. An
element normally has an opening tag, content, and a closing tag.

```html
<h1>Tasks</h1>
<input placeholder="What needs doing?" />
<button>Add</button>
```

An attribute is a setting inside an opening tag. In the example, `placeholder`
is an attribute of the input element.

## JavaScript adds behavior

JavaScript stores data, makes decisions, and responds to events such as a button
click. A value stored under a name is a variable. A function is reusable
behavior.

```js
const task = 'Read the tutorial';

function describeTask() {
  return task;
}
```

## The DOM is the live page

The browser turns HTML into a tree of JavaScript objects called the Document
Object Model, or DOM. AngularTS connects application data to this tree. When the
data changes, AngularTS updates the affected DOM properties for you.

## Use the browser developer tools

Open an HTML file in the browser. Press `F12` or use the browser menu to open
Developer Tools. The Console tab reports JavaScript errors. Always start with
the first error because later errors may be consequences of it.

## Next step

Read the [AngularTS
introduction]({{< relref "/docs/get-started/introduction" >}}).
