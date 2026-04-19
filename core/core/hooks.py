def preprocess_authentication_tags(endpoints):
    result = []

    for path, path_regex, method, callback in endpoints:
        if path.startswith("/api/auth/"):
            schema = callback.cls.schema if hasattr(callback, "cls") else None

            if schema and hasattr(schema, "tags"):
                schema.tags = ["Authentication"]

        result.append((path, path_regex, method, callback))

    return result


def preprocess_spectacular_schema(result, generator, request, public):
    paths = result.get("paths", {})

    for path, path_item in paths.items():
        for method, operation in path_item.items():
            if method in ["get", "post", "put", "patch", "delete", "options", "head"]:
                tags = operation.get("tags", [])

                if "auth" in tags:
                    new_tags = ["Authentication" if tag == "auth" else tag for tag in tags]
                    operation["tags"] = new_tags

                if "schema" in tags:
                    new_tags = ["API Schema" if tag == "schema" else tag for tag in tags]
                    operation["tags"] = new_tags

    if "tags" in result:
        result["tags"] = [
            tag for tag in result["tags"]
            if tag.get("name") not in ["auth", "schema"]
        ]

    return result
