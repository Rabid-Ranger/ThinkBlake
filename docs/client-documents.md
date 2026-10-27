# Client PDF resources

Client resources support existing links plus private PDF uploads up to 20 MB.
Upload PDF saves the file to Supabase Storage and adds only its metadata to the
creator's existing clientResources list. View PDF fetches the file with the current
cloud session and opens a PDF blob in a new tab; Download saves a separate copy.
Browser PDF preferences can still choose an external viewer or download behavior.

## Live storage setup (applied October 27, 2026)

Applied database/setup-client-documents.sql against project pqggobwpazihraeqvspc.
It created the private client-documents bucket and membership-based read/upload
policies. Editors, admins and owners can upload; workspace members can read.
No service key or public file URL is used. Existing workspace state is untouched.
Without this setup uploads report a storage setup error and do not add a broken
resource. PDFs are not exposed by creator video share links.

## Verification

Run node --test tests/client-documents.test.js.
After setup, sign into the dashboard, upload a disposable PDF, verify View PDF
and Download, edit its label/note, pin it, and reload to confirm cloud persistence.
Verify an unrelated workspace and a signed-out session cannot read the file.
Stored objects are immutable; this release does not delete uploaded files.

Production verification: the live dashboard renders Upload PDF and its upload form.
The bucket query confirmed public=false, file_size_limit=20971520 and
allowed_mime_types=[application/pdf]. The 20 targeted automated checks pass.
A real browser upload is pending because the Chrome automation extension has
not been granted access to local file URLs; no test document was uploaded.
