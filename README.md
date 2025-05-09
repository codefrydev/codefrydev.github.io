# Code Fry Dev (CFD)

## Build Using HUGO


> Plan to replace font awesome icom with svg
- Chages will be in two file

```html
<button class="neumorphic hapticButton">
  <!--  <i class="{{ .icon }}"></i> -->
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48…Z"/>
  </svg>
  <span>Dashboard</span>
</button>
```

- Css Changes

```css
/* replace > i with > .icon */
button.neumorphic > .icon {
  width: 31cqi;
  height: 31cqi;
  fill: currentColor;     
  display: block;
}

/* active state—you had > i { font-size:28cqi } */
button.neumorphic:active > .icon,
button.neumorphic.active > .icon {
  width: 28cqi;
  height: 28cqi;
}

/* text stays same */
button.neumorphic > span { /* …unchanged… */ }
```
