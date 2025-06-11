Tool for querying fonts used in ASS files.

## Build

```bash
go run ./preprocess/scan ./font_dir ./fonts.db
go run ./preprocess/generate ./fonts.db
pnpm build
```
