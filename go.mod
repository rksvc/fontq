module preprocessor

go 1.24.3

tool (
	preprocessor/cmd/generate
	preprocessor/cmd/scan
)

require (
	github.com/ConradIrwin/font v0.2.2-0.20250611142822-4a9a5718cf12
	github.com/mattn/go-sqlite3 v1.14.28
	golang.org/x/text v0.26.0
)

require (
	dmitri.shuralyov.com/font/woff2 v0.0.0-20180220214647-957792cbbdab // indirect
	github.com/dsnet/compress v0.0.1 // indirect
)
