# Client resources

One Add resource entry opens a choice between Add a link and Upload a file.
The empty-state Add the first one control opens the same chooser. Manage opens
all resources for the selected creator, with the same Add resource action.

Any file up to 20 MB can be uploaded. The original filename and MIME type are
retained. The file lives in private Supabase Storage; only metadata enters
clientResources in the cloud workspace. PDFs, common raster images, plain text
and supported media have a View action. Other formats open a page with their
filename and a download link. Download is available separately for every file.
HTML, SVG, scripts and unknown formats are downloaded rather than executed.
Removing a file resource removes its listing and retains its storage object.
Existing PDF resource metadata remains compatible.

## Live storage setup

Applied database/setup-client-documents.sql to pqggobwpazihraeqvspc on October 27,
2026. The client-documents bucket is private with a 20971520-byte limit. Its MIME
allowlist is null, allowing all file formats. Workspace owner/admin/editor
members may upload, and workspace members may read. Policy names retain their
original PDF names for compatibility. No service key or public file URL is used.
Creator video share links do not expose these resources.

## QA

Run node --test tests/client-documents.test.js tests/creator-portal.test.js
tests/ui-plain-language.test.js. All 26 checks pass, including unsupported active
format handling, arbitrary file metadata, PDF validation, upload failure,
workspace isolation, sign-in requirements, and authenticated PDF blob viewing.
The user will perform the real file-upload test; do not select their local files
through automation. Check the live chooser, link flow, file form, Back, drawer,
and responsive layout independently.

Live browser QA also confirmed both chooser paths, empty-file feedback, Back,
link saving/pinning, cloud save confirmation, reload persistence, and the corrected
file form layout. The temporary QA link was removed after testing.
