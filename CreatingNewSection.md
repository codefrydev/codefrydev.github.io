# Steps to create new Section for this Website

> Let say we are going to add new section called **store**

## Step I

> Create Folder Inside Content Folder store.

> And Inside created folder create _index.md File


Example .

```sh
Content
=> store
    => _index.md
```

## Step II

> Inside _index.md fill below data

```sh
---
title: "Store"
date: 2025-07-07T00:00:00Z
---
```

## Step III

> create store.yaml file inside data folder

```sh
Data
=> stole.yml
```

## Step IV

> Data inside stole will something look like this.

```sh
data:
  - name: "Water Reminder"
    icon: "cfd-waterreminder"
    url: "https://play.google.com/"
```

## Step V

> Inside layout create store folder and in that folder create store.html file

```sh
layouts
=> store
    => store.html
```

> indside store html put you desired html code