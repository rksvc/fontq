Tool for querying fonts used by ASS files, can also match fonts in [超级字体整合包 XZ](https://vcb-s.com/archives/1114).

## Build

```bash
go run ./preprocess/scan ./font_dir ./fonts.db
go run ./preprocess/generate ./fonts.db
pnpm build
```
