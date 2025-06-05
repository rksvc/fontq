use rusqlite::Connection;
use std::{env::args, fs, os::unix::fs::MetadataExt};
use ttf_parser::{
    Face, PlatformId, fonts_in_collection,
    name_id::{FULL_NAME, POST_SCRIPT_NAME},
};
use walkdir::WalkDir;

fn main() {
    let args = args().skip(1).collect::<Vec<_>>();
    let [root, db] = &args[..] else {
        println!("usage: preprocess ./font_dir ./font.db");
        return;
    };

    let conn = Connection::open(db).unwrap();
    conn.execute_batch(
        "create table font (
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
        );",
    )
    .unwrap();

    for entry in WalkDir::new(root) {
        let entry = entry.unwrap();
        if entry.file_type().is_dir() {
            continue;
        }
        let path = entry
            .path()
            .strip_prefix(root)
            .unwrap()
            .to_str()
            .unwrap()
            .replace('\\', "/");
        println!("{}", path);
        let size = entry.metadata().unwrap().size();
        conn.execute(
            "insert into font (path, size) values (?1, ?2)",
            (&path, size),
        )
        .unwrap();
        let data = fs::read(entry.path()).unwrap();
        match fonts_in_collection(&data) {
            Some(n) => {
                for index in 0..n {
                    parse(&path, &conn, &data, index);
                }
            }
            None => parse(&path, &conn, &data, 0),
        }
    }
}

fn parse(path: &str, conn: &Connection, data: &[u8], index: u32) {
    let Ok(face) = Face::parse(data, index) else {
        conn.execute("insert into error (path) values (?1)", (path,))
            .unwrap();
        return;
    };
    for name in face.names() {
        if !matches!(name.name_id, FULL_NAME | POST_SCRIPT_NAME) || name.name.is_empty() {
            continue;
        }
        let platform_id = match name.platform_id {
            PlatformId::Unicode => 0,
            PlatformId::Macintosh => 1,
            PlatformId::Iso => 2,
            PlatformId::Windows => 3,
            PlatformId::Custom => 4,
        };
        conn.execute(
            "insert into name (path, i, platform_id, encoding_id, name_id, name)
            values (?1, ?2, ?3, ?4, ?5, ?6)",
            (
                path,
                index,
                platform_id,
                name.encoding_id,
                name.name_id,
                name.name,
            ),
        )
        .unwrap();
    }
}
