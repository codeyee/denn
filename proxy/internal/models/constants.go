package models

type ImageType string
type ImageSize string
type ContentType string
type AuthorType string
type AlbumType string

const (
	ImageTypePoster  ImageType = "poster"
	ImageTypeGallery ImageType = "gallery"

	ImageSizeStandard ImageSize = "standard"
	ImageSizeOriginal ImageSize = "original"

	ContentTypeMovie  ContentType = "movie"
	ContentTypeTVShow ContentType = "tv_show"
	ContentTypeGame   ContentType = "game"
	ContentTypeAlbum  ContentType = "album"
	ContentTypeBook   ContentType = "book"
	ContentTypeSeason ContentType = "season"
	ContentTypePerson ContentType = "person"

	AuthorTypeDirector   AuthorType = "director"
	AuthorTypeActor      AuthorType = "actor"
	AuthorTypeWriter     AuthorType = "writer"
	AuthorTypeArtist     AuthorType = "artist"
	AuthorTypeDeveloper  AuthorType = "developer"
	AuthorTypePublisher  AuthorType = "publisher"
	AuthorTypeCreator    AuthorType = "creator"
	AuthorTypeAuthor     AuthorType = "author"
	AuthorTypeComposer   AuthorType = "composer"
	AuthorTypeProducer   AuthorType = "producer"
	AuthorTypeScreenplay AuthorType = "screenplay"

	AlbumTypeAlbum  AlbumType = "album"
	AlbumTypeEP     AlbumType = "ep"
	AlbumTypeSingle AlbumType = "single"

	DefaultImagesSize = 10
)
