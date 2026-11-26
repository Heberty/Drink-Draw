"""SQLite operations for the Drink Draw server. Uses Python's standard library."""
import base64
import hashlib
import json
import sqlite3
import sys
import unicodedata
from pathlib import Path
from urllib.parse import quote


class ValidationError(Exception):
    pass


choice_references = {
    "brands": ("drinks", "brand"),
    "types": ("drinks", "type"),
    "establishmentTypes": ("establishments", "type"),
}


def label(value):
    return unicodedata.normalize("NFC", value.strip()).lower()


def setup(db, seed):
    if db.execute("PRAGMA user_version").fetchone()[0] == 3:
        return
    with db:
        db.execute("BEGIN IMMEDIATE")
        version = db.execute("PRAGMA user_version").fetchone()[0]
        if version == 0:
            db.execute("""CREATE TABLE IF NOT EXISTS catalog_records (
                collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
                image BLOB, image_type TEXT, image_version TEXT,
                PRIMARY KEY (collection, id)
            )""")
            db.executemany(
                "INSERT INTO catalog_records (collection, id, data) VALUES (?, ?, ?)",
                ((group, row["id"], json.dumps(row, ensure_ascii=False))
                 for group, records in seed.items() for row in records),
            )
        if version < 2:
            db.execute("""CREATE TABLE IF NOT EXISTS panel_users (
                id TEXT PRIMARY KEY, username TEXT NOT NULL, username_key TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
                password_hash TEXT NOT NULL, session_version INTEGER NOT NULL DEFAULT 1
            )""")
        if version < 3:
            kinds = {item["id"]: item for item in seed["establishmentTypes"]}
            for establishment in raw_records(db, "establishments"):
                name = establishment["type"]
                identifier = label(name)
                kinds.setdefault(identifier, {"id": identifier, "name": name})
            db.executemany(
                "INSERT OR IGNORE INTO catalog_records (collection, id, data) VALUES ('establishmentTypes', ?, ?)",
                ((kind["id"], json.dumps(kind, ensure_ascii=False)) for kind in kinds.values()),
            )
            db.execute("PRAGMA user_version = 3")


def decode(row):
    record = json.loads(row["data"])
    if row["image_version"]:
        identifier = quote(row["id"], safe="")
        record["image"] = f'/api/catalogo/imagem/{row["collection"]}/{identifier}?v={row["image_version"]}'
    return record


def raw_records(db, collection):
    rows = db.execute("SELECT data FROM catalog_records WHERE collection = ?", (collection,))
    return [json.loads(row["data"]) for row in rows]


def get_record(db, collection, identifier):
    return db.execute(
        "SELECT collection, id, data, image_version FROM catalog_records WHERE collection = ? AND id = ?",
        (collection, identifier),
    ).fetchone()


def matching_choice(db, collection, name):
    return next((item["name"] for item in raw_records(db, collection)
                 if label(item["name"]) == label(name)), None)


def store(db, collection, record, image="keep"):
    data = json.dumps(record, ensure_ascii=False)
    if image == "keep":
        db.execute("""INSERT INTO catalog_records (collection, id, data) VALUES (?, ?, ?)
            ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data""",
                   (collection, record["id"], data))
        return

    blob = base64.b64decode(image["data"]) if image else None
    mime = image["type"] if image else None
    version = hashlib.sha256(blob).hexdigest()[:16] if blob else None
    db.execute("""INSERT INTO catalog_records
        (collection, id, data, image, image_type, image_version) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data,
        image = excluded.image, image_type = excluded.image_type, image_version = excluded.image_version""",
               (collection, record["id"], data, blob, mime, version))


def save_record(db, seed, collection, record, importing, image):
    record = dict(record)
    identifier = record["id"]
    current = get_record(db, collection, identifier)
    original = next((row for row in seed[collection] if row["id"] == identifier), None)
    is_choice = collection in choice_references
    if importing and current and is_choice and original and label(original["name"]) != label(record["name"]):
        identifier = "import-" + hashlib.sha256(label(record["name"]).encode()).hexdigest()[:24]
        record["id"] = identifier
        current = get_record(db, collection, identifier)
        original = None
    previous = json.loads(current["data"]) if current else None
    if importing and current:
        if not original or current["image_version"] or previous != original:
            return False
        if image == "keep" and record == original:
            return False

    if is_choice:
        options = raw_records(db, collection)
        if any(option["id"] != identifier and label(option["name"]) == label(record["name"]) for option in options):
            if importing:
                return False
            raise ValidationError("Já existe um cadastro com esse nome.")
        if previous and previous["name"] != record["name"]:
            related, field = choice_references[collection]
            for item in raw_records(db, related):
                if label(item[field]) == label(previous["name"]):
                    store(db, related, {**item, field: record["name"]})

    if collection == "establishments":
        kind = matching_choice(db, "establishmentTypes", record["type"])
        if not kind:
            raise ValidationError("Selecione um tipo de estabelecimento cadastrado.")
        record["type"] = kind
    if collection == "drinks":
        brand = matching_choice(db, "brands", record["brand"])
        kind = matching_choice(db, "types", record["type"])
        if not brand or not kind:
            raise ValidationError("Selecione uma marca e um tipo cadastrados.")
        establishment_id = record.get("referenceEstablishmentId")
        if establishment_id and not get_record(db, "establishments", establishment_id):
            raise ValidationError("Selecione um estabelecimento cadastrado.")
        record.update(brand=brand, type=kind)
    store(db, collection, record, image)
    return True


def delete_record(db, collection, identifier):
    if collection == "establishments" and any(
        drink.get("referenceEstablishmentId") == identifier for drink in raw_records(db, "drinks")
    ):
        raise ValidationError("Este estabelecimento está em uso. Atualize as bebidas vinculadas antes de excluir.")
    if collection in choice_references:
        option = get_record(db, collection, identifier)
        if option:
            name = label(json.loads(option["data"])["name"])
            related, field = choice_references[collection]
            if any(label(item[field]) == name for item in raw_records(db, related)):
                records = "os estabelecimentos vinculados" if related == "establishments" else "as bebidas vinculadas"
                raise ValidationError(f"Este cadastro está em uso. Atualize {records} antes de excluir.")
    db.execute("DELETE FROM catalog_records WHERE collection = ? AND id = ?", (collection, identifier))


def public_user(row):
    return {key: row[key] for key in ("id", "username", "name", "role")}


def authenticated_admin(db, actor):
    row = db.execute("SELECT role, session_version FROM panel_users WHERE id = ?", (actor["id"],)).fetchone()
    if not row or row["role"] != "admin" or row["session_version"] != actor["sessionVersion"]:
        raise ValidationError("Somente administradores podem gerenciar usuários.")


def save_user(db, actor, user):
    authenticated_admin(db, actor)
    existing = db.execute("SELECT * FROM panel_users WHERE id = ?", (user["id"],)).fetchone()
    if user["id"] == actor["id"] and user["role"] != "admin":
        raise ValidationError("Você precisa manter o perfil de administrador da sua própria conta.")
    if db.execute("SELECT 1 FROM panel_users WHERE username_key = ? AND id <> ?",
                  (label(user["username"]), user["id"])).fetchone():
        raise ValidationError("Já existe uma conta com esse usuário.")
    password_hash = user.get("passwordHash")
    if not existing:
        if not password_hash:
            raise ValidationError("Informe uma senha para a nova conta.")
        db.execute("""INSERT INTO panel_users (id, username, username_key, name, role, password_hash)
            VALUES (?, ?, ?, ?, ?, ?)""",
                   (user["id"], user["username"], label(user["username"]), user["name"], user["role"], password_hash))
    else:
        changed = bool(password_hash or existing["role"] != user["role"] or existing["username"] != user["username"])
        db.execute("""UPDATE panel_users SET username = ?, username_key = ?, name = ?, role = ?,
            password_hash = ?, session_version = session_version + ? WHERE id = ?""",
                   (user["username"], label(user["username"]), user["name"], user["role"],
                    password_hash or existing["password_hash"], int(changed), user["id"]))


def run(db, seed, command, args):
    if command == "catalog":
        catalog = {name: [] for name in seed}
        for row in db.execute("SELECT collection, id, data, image_version FROM catalog_records ORDER BY id"):
            catalog[row["collection"]].append(decode(row))
        return catalog
    if command == "drink":
        row = get_record(db, "drinks", args["id"])
        return decode(row) if row else None
    if command == "image":
        row = db.execute("SELECT image, image_type FROM catalog_records WHERE collection = ? AND id = ?",
                         (args["collection"], args["id"])).fetchone()
        return {"data": base64.b64encode(row["image"]).decode(), "type": row["image_type"]} if row and row["image"] else None
    if command == "has_users":
        return bool(db.execute("SELECT 1 FROM panel_users LIMIT 1").fetchone())
    if command in ("user_by_name", "user_by_id"):
        if command == "user_by_id":
            row = db.execute("SELECT * FROM panel_users WHERE id = ?", (args["value"],)).fetchone()
        else:
            row = db.execute("SELECT * FROM panel_users WHERE username_key = ?", (label(args["value"]),)).fetchone()
        return {**public_user(row), "passwordHash": row["password_hash"], "sessionVersion": row["session_version"]} if row else None
    if command == "users":
        with db:
            db.execute("BEGIN")
            authenticated_admin(db, args["actor"])
            return [public_user(row) for row in db.execute("SELECT * FROM panel_users ORDER BY username_key")]

    with db:
        db.execute("BEGIN IMMEDIATE")
        if command == "save_record":
            return save_record(db, seed, args["collection"], args["record"], args["importing"], args["image"])
        if command == "delete_record":
            return delete_record(db, args["collection"], args["id"])
        if command == "bootstrap":
            user = args["user"]
            if not db.execute("SELECT 1 FROM panel_users LIMIT 1").fetchone():
                db.execute("""INSERT INTO panel_users (id, username, username_key, name, role, password_hash)
                    VALUES (?, ?, ?, ?, 'admin', ?)""",
                           (user["id"], user["username"], label(user["username"]), user["name"], user["passwordHash"]))
            return None
        if command == "save_user":
            return save_user(db, args["actor"], args["user"])
        if command == "delete_user":
            actor = args["actor"]
            authenticated_admin(db, actor)
            if actor["id"] == args["id"]:
                raise ValidationError("Você não pode excluir a própria conta.")
            db.execute("DELETE FROM panel_users WHERE id = ?", (args["id"],))
            return None
        raise RuntimeError("Operação SQLite desconhecida.")


def main():
    request = json.load(sys.stdin)
    path = Path(request["path"])
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=5)
    db.row_factory = sqlite3.Row
    try:
        db.execute("PRAGMA journal_mode = WAL")
        setup(db, request["seed"])
        try:
            result = run(db, request["seed"], request["command"], request["args"])
            print(json.dumps({"result": result}, ensure_ascii=False))
        except ValidationError as error:
            print(json.dumps({"error": str(error)}, ensure_ascii=False))
    finally:
        db.close()


if __name__ == "__main__":
    main()
