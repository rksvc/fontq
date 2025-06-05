package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"os"

	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/encoding/japanese"
	"golang.org/x/text/encoding/korean"
	"golang.org/x/text/encoding/simplifiedchinese"
	"golang.org/x/text/encoding/traditionalchinese"
	"golang.org/x/text/encoding/unicode"
	"golang.org/x/text/transform"
)

type font struct {
	Path string `json:"path"`
	Size int    `json:"size"`
}
type data struct {
	Fonts       []font           `json:"fonts"`
	NameToIdxes map[string][]int `json:"name_to_idxes"`
}

var (
	fonts       = []font{}
	pathToIdx   = make(map[string]int)
	nameToIdxes = make(map[string]map[int]struct{})
)

func main() {
	if len(os.Args) != 2 {
		fmt.Println("usage: preprocess ./font.db")
		return
	}
	db, err := sql.Open("sqlite3", os.Args[1])
	if err != nil {
		panic(err)
	}

	rows, err := db.Query(`
		select
			name.path, platform_id,
			encoding_id, name_id, name, size
		from name
		left join font
		on name.path = font.path
	`)
	if err != nil {
		panic(err)
	}
	for rows.Next() {
		var path string
		var platformId, encodingId, nameId, size int
		var rawName []byte
		err := rows.Scan(&path, &platformId, &encodingId, &nameId, &rawName, &size)
		if err != nil {
			panic(err)
		}

		var t transform.Transformer
		// https://learn.microsoft.com/en-us/typography/opentype/spec/name#platform-encoding-and-language-ids
		switch platformId {
		case 0:
			t = unicode.UTF16(unicode.BigEndian, unicode.IgnoreBOM).NewDecoder()
		case 1:
			switch encodingId {
			case 0:
				t = charmap.Macintosh.NewDecoder()
			case 1:
				t = japanese.ShiftJIS.NewDecoder()
			case 2:
				t = traditionalchinese.Big5.NewDecoder()
			case 3:
				t = korean.EUCKR.NewDecoder()
			case 25:
				t = simplifiedchinese.GBK.NewDecoder()
			}
		case 2:
			t = transform.Nop
		case 3:
			switch encodingId {
			case 3:
				t = simplifiedchinese.GBK.NewDecoder()
			case 4:
				t = traditionalchinese.Big5.NewDecoder()
			case 5:
				t = korean.EUCKR.NewDecoder()
			default:
				t = unicode.UTF16(unicode.BigEndian, unicode.IgnoreBOM).NewDecoder()
			}
		}
		if t == nil {
			panic(fmt.Errorf("unsupported platform ID %d and encoding ID %d", platformId, encodingId))
		}

		r := transform.NewReader(bytes.NewReader(rawName), t)
		bytes, err := io.ReadAll(r)
		if err != nil {
			panic(err)
		}
		name := string(bytes)

		idx, ok := pathToIdx[path]
		if !ok {
			idx = len(fonts)
			pathToIdx[path] = idx
			fonts = append(fonts, font{Path: path, Size: size})
		}
		idxes, ok := nameToIdxes[name]
		if !ok {
			idxes = make(map[int]struct{})
			nameToIdxes[name] = idxes
		}
		idxes[idx] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		panic(err)
	}

	result := data{fonts, map[string][]int{}}
	for name, idxes := range nameToIdxes {
		for idx := range idxes {
			result.NameToIdxes[name] = append(result.NameToIdxes[name], idx)
		}
	}
	f, err := os.Create("fonts.json")
	if err != nil {
		panic(err)
	}
	err = json.NewEncoder(f).Encode(result)
	if err != nil {
		panic(err)
	}
	err = f.Close()
	if err != nil {
		panic(err)
	}
}
