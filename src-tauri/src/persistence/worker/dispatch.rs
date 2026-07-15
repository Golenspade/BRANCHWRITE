use super::{read_health, Request};
use crate::persistence::domain::{books, documents, versions};
use rusqlite::Connection;

pub fn handle(connection: &mut Connection, request: Request) -> bool {
    match request {
        Request::Health { respond_to } => {
            let _ = respond_to.send(read_health(connection));
        }
        Request::ListBooks { respond_to } => {
            let _ = respond_to.send(books::list(connection));
        }
        Request::GetBook { id, respond_to } => {
            let _ = respond_to.send(books::get(connection, &id));
        }
        Request::CreateBook { input, respond_to } => {
            let _ = respond_to.send(books::create(connection, input));
        }
        Request::UpdateBook { input, respond_to } => {
            let _ = respond_to.send(books::update(connection, input));
        }
        Request::DeleteBook { id, respond_to } => {
            let _ = respond_to.send(books::delete(connection, &id));
        }
        Request::ListDocuments {
            book_id,
            respond_to,
        } => {
            let _ = respond_to.send(documents::list(connection, &book_id));
        }
        Request::GetDocument { id, respond_to } => {
            let _ = respond_to.send(documents::get(connection, &id));
        }
        Request::CreateDocument { input, respond_to } => {
            let _ = respond_to.send(documents::create(connection, input));
        }
        Request::UpdateDocumentMetadata { input, respond_to } => {
            let _ = respond_to.send(documents::update_metadata(connection, input));
        }
        Request::SaveDocument { input, respond_to } => {
            let _ = respond_to.send(documents::save(connection, input));
        }
        Request::DeleteDocument { id, respond_to } => {
            let _ = respond_to.send(documents::delete(connection, &id));
        }
        Request::ListVersions {
            document_id,
            respond_to,
        } => {
            let _ = respond_to.send(versions::list(connection, &document_id));
        }
        Request::GetVersion {
            document_id,
            version_id,
            respond_to,
        } => {
            let _ = respond_to.send(versions::get(connection, &document_id, &version_id));
        }
        Request::CreateVersion { input, respond_to } => {
            let _ = respond_to.send(versions::create(connection, input));
        }
        Request::RestoreVersion { input, respond_to } => {
            let _ = respond_to.send(versions::restore(connection, input));
        }
        Request::Shutdown { respond_to } => {
            let _ = respond_to.send(Ok(()));
            return true;
        }
    }
    false
}
