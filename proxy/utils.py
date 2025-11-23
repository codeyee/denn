from typing import Dict, List, Any

def filter_dictionary(data: Any, fields: List[str]) -> Any:
    """
    Filter a dictionary (or list of dictionaries) to include only the specified fields.
    Supports dot notation for nested fields (e.g., 'cover.url').
    """
    if not fields:
        return data

    if isinstance(data, list):
        return [filter_dictionary(item, fields) for item in data]

    if not isinstance(data, dict):
        return data

    filtered_data = {}
    
    for field in fields:
        parts = field.split('.')
        current_part = parts[0]
        remaining_parts = parts[1:]
        
        if current_part in data:
            if not remaining_parts:
                # Leaf node, copy value
                filtered_data[current_part] = data[current_part]
            else:
                # Nested field
                nested_field = '.'.join(remaining_parts)
                
                # Initialize nested structure if not present
                if current_part not in filtered_data:
                    # We need to look ahead to see if we should initialize a list or dict?
                    # Actually, we can just call filter_dictionary recursively and merge
                    # But merging is complex. 
                    # Simpler approach: gather all sub-fields for this part and recurse once.
                    pass 
                
    # Better approach: Group fields by their first part
    fields_by_root = {}
    for field in fields:
        parts = field.split('.')
        root = parts[0]
        rest = '.'.join(parts[1:]) if len(parts) > 1 else None
        
        if root not in fields_by_root:
            fields_by_root[root] = []
        if rest:
            fields_by_root[root].append(rest)
            
    for root, sub_fields in fields_by_root.items():
        if root in data:
            if not sub_fields:
                # Include the whole object if no sub-fields specified? 
                # Wait, if I ask for 'id', I get id. 
                # If I ask for 'seasons', I get whole seasons?
                # If I ask for 'seasons.name', I get filtered seasons.
                # If I ask for 'seasons' AND 'seasons.name', what happens?
                # Usually specific overrides general, or union?
                # Let's assume union: if 'seasons' is present, include everything.
                # But here sub_fields is empty only if 'root' was in fields list explicitly.
                # If 'root' was explicitly requested, we take it all.
                # But wait, the loop iterates over fields.
                # If fields=['seasons.name'], sub_fields=['name'].
                # If fields=['seasons'], sub_fields=[].
                
                # However, if fields=['seasons', 'seasons.name'], sub_fields=['name'].
                # We should probably detect if 'root' itself is in fields.
                if root in fields:
                     filtered_data[root] = data[root]
                else:
                     filtered_data[root] = filter_dictionary(data[root], sub_fields)
            else:
                # If root is explicitly in fields, we shouldn't filter it further?
                # E.g. fields=['user', 'user.name']. User wants full user object.
                if root in fields:
                    filtered_data[root] = data[root]
                else:
                    filtered_data[root] = filter_dictionary(data[root], sub_fields)
                    
    return filtered_data
