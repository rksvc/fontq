Tool for querying fonts used by ASS files and finding the corresponding font files in [超级字体整合包 XZ](https://vcb-s.com/archives/1114), also checks if fonts are installed.

## Build

```bash
go tool scan ./font_dir ./fonts.db
go tool generate ./fonts.db
pnpm build
```

## Credits

- [fluentui-emoji](https://github.com/microsoft/fluentui-emoji) for icon.
