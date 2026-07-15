use app_lib::persistence::dto::{
    CreateBookInput, CreateDocumentInput, SaveDocumentInput, UpdateBookInput,
    UpdateDocumentMetadataInput,
};
use serde_json::json;

#[test]
fn input_dtos_round_trip_with_camel_case_fields() {
    let book: CreateBookInput = serde_json::from_value(json!({
        "name": "Book",
        "description": "",
        "author": "",
        "genre": "general",
        "coverImage": null,
        "tags": [],
        "settings": {}
    }))
    .unwrap();
    assert_eq!(book.cover_image, None);

    let save: SaveDocumentInput = serde_json::from_value(json!({
        "documentId": "document",
        "content": "text",
        "expectedRevision": 3
    }))
    .unwrap();
    assert_eq!(save.expected_revision, 3);

    let update_book: UpdateBookInput = serde_json::from_value(json!({
        "id": "book",
        "name": "Book",
        "description": "",
        "author": "",
        "genre": "general",
        "coverImage": "cover.png",
        "tags": ["draft"],
        "settings": {"theme": "dark"}
    }))
    .unwrap();
    let update_book_json = serde_json::to_value(update_book).unwrap();
    assert_eq!(update_book_json["coverImage"], json!("cover.png"));
    assert!(update_book_json.get("cover_image").is_none());

    let create_document: CreateDocumentInput = serde_json::from_value(json!({
        "bookId": "book",
        "title": "Chapter",
        "sortOrder": 2,
        "documentType": "chapter",
        "status": "draft",
        "content": "text"
    }))
    .unwrap();
    let create_document_json = serde_json::to_value(create_document).unwrap();
    assert_eq!(create_document_json["bookId"], json!("book"));
    assert_eq!(create_document_json["sortOrder"], json!(2));
    assert_eq!(create_document_json["documentType"], json!("chapter"));
    assert!(create_document_json.get("book_id").is_none());

    let metadata: UpdateDocumentMetadataInput = serde_json::from_value(json!({
        "documentId": "document",
        "title": "Chapter",
        "sortOrder": 3,
        "documentType": "section",
        "status": "review",
        "expectedRevision": 4
    }))
    .unwrap();
    let metadata_json = serde_json::to_value(metadata).unwrap();
    assert_eq!(metadata_json["documentId"], json!("document"));
    assert_eq!(metadata_json["expectedRevision"], json!(4));
    assert!(metadata_json.get("expected_revision").is_none());
}
