export { authActions } from "./actions/auth";
export { contentItemActions } from "./actions/contentItem";
export { listActions } from "./actions/list";
export { listItemActions } from "./actions/listItem";
export { invitationActions } from "./actions/invitation";
export { memberActions } from "./actions/member";
export { ratingActions } from "./actions/rating";
export { videoActions } from "./actions/video";
export { musicActions } from "./actions/music";
export { gameActions } from "./actions/game";
export { bookActions } from "./actions/book";
export { homepageActions } from "./actions/homepage";
export { searchActions } from "./actions/search";
export { browseActions } from "./actions/browse";
export { profileActions } from "./actions/profile";
export { trackingActions } from "./actions/tracking";
export { dynamicCollectionActions } from "./actions/dynamicCollections";

import { authActions } from "./actions/auth";
import { contentItemActions } from "./actions/contentItem";
import { listActions } from "./actions/list";
import { listItemActions } from "./actions/listItem";
import { invitationActions } from "./actions/invitation";
import { memberActions } from "./actions/member";
import { ratingActions } from "./actions/rating";
import { videoActions } from "./actions/video";
import { musicActions } from "./actions/music";
import { gameActions } from "./actions/game";
import { bookActions } from "./actions/book";
import { homepageActions } from "./actions/homepage";
import { searchActions } from "./actions/search";
import { browseActions } from "./actions/browse";
import { profileActions } from "./actions/profile";
import { trackingActions } from "./actions/tracking";
import { dynamicCollectionActions } from "./actions/dynamicCollections";

export const apiActions = {
    auth: authActions,
    contentItem: contentItemActions,
    list: listActions,
    listItem: listItemActions,
    invitation: invitationActions,
    member: memberActions,
    rating: ratingActions,
    video: videoActions,
    music: musicActions,
    game: gameActions,
    book: bookActions,
    homepage: homepageActions,
    search: searchActions,
    browse: browseActions,
    profile: profileActions,
    tracking: trackingActions,
    dynamicCollections: dynamicCollectionActions,
};

export default apiActions;
