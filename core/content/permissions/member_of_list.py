from content.services.list_policy import ListAction, ListActionPermission


class IsMemberOfList:
    """Compatibility alias for list-read authorization."""

    def __new__(cls):
        return ListActionPermission(ListAction.VIEW)
