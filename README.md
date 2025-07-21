# Adding a New Section: **Store**

This guide outlines steps to add a new section called **Store** to the website.

---

## **Step I. Create Content Folder**

1. Inside the `content` folder, create a new folder named `store`.
2. Inside the `store` folder, create a file named `_index.md`.

**Example Structure:**

```sh
content/
└── store/
    └── _index.md
```

---

## **Step II. Configure \_index.md**

Add the following front matter to `_index.md`:

```yaml
---
title: "Store"
date: 2025-07-07T00:00:00Z
---
```

---

## **Step III. Create Data File**

1. Inside the `data` folder, create a new file named `store.yaml`.

**Example Structure:**

```sh
data/
└── store.yaml
```

---

## **Step IV. Add Store Data**

Populate `store.yaml` with data in the following format:

```yaml
data:
  - name: "Water Reminder"
    icon: "cfd-waterreminder"
    url: "https://play.google.com/"
```

* **name**: Display name of the store item.
* **icon**: Icon class or identifier for the item.
* **url**: Link to the item.

---

## **Step V. Create Layout Template**

1. Inside the `layouts` folder, create a new folder named `store`.
2. Inside the `store` folder, create a file named `store.html`.

**Example Structure:**

```sh
layouts/
└── store/
    └── store.html
```

2. Add your desired HTML template code in `store.html` to render the Store section on the website.

---

## ✅ **Summary Checklist**

✔️ `content/store/_index.md` created and configured
✔️ `data/store.yaml` created with store items
✔️ `layouts/store/store.html` created with the section layout
