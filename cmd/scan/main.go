package main

import (
	"database/sql"
	"io/fs"
	"os"
	"path"

	"github.com/ConradIrwin/font/sfnt"
	_ "github.com/mattn/go-sqlite3"
)

func main() {
	if len(os.Args) != 3 {
		println("usage: scan ./font_dir ./fonts.db")
		return
	}
	root := os.Args[1]
	db, err := sql.Open("sqlite3", os.Args[2])
	if err != nil {
		panic(err)
	}
	defer db.Close()

	_, err = db.Exec(`
		create table font (
			path text primary key,
			size integer
		);
		create table name (
			path text references font(path),
			i integer,
			platform_id integer,
			encoding_id integer,
			name_id integer,
			name blob
		);
		create table error (
			path text references font(path)
		);`)
	if err != nil {
		panic(err)
	}

	err = fs.WalkDir(os.DirFS(root), ".", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		} else if d.IsDir() {
			return nil
		}
		println(p)

		info, err := d.Info()
		if err != nil {
			panic(err)
		}
		_, err = db.Exec(`insert into font (path, size) values (?, ?)`, p, info.Size())
		if err != nil {
			panic(err)
		}

		f, err := os.Open(path.Join(root, p))
		if err != nil {
			panic(err)
		}
		defer f.Close()
		fonts, err := sfnt.ParseCollection(f)
		if err != nil {
			_, err = db.Exec(`insert into error (path) values (?)`, p)
			if err != nil {
				panic(err)
			}
			return nil
		}

		for i, font := range fonts {
			name, err := font.NameTable()
			if err != nil {
				panic(err)
			}
			for _, entry := range name.List() {
				if (entry.NameID != sfnt.NameFull && entry.NameID != sfnt.NamePostscript) || len(entry.Value) == 0 {
					continue
				}
				_, err = db.Exec(`
					insert into name (path, i, platform_id, encoding_id, name_id, name)
					values (?, ?, ?, ?, ?, ?)`,
					p, i, entry.PlatformID, entry.EncodingID, entry.NameID, entry.Value)
				if err != nil {
					panic(err)
				}
			}
		}
		return nil
	})
	if err != nil {
		panic(err)
	}
}
