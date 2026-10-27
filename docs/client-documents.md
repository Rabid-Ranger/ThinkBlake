# Client PDF resources

Client resources support existing links plus private PDF uploads up to 20 MB.
Upload PDF saves the file to Supabase Storage and adds only its metadata to the
creator's existing clientResources list. View PDF fetches the file with the current
cloud session and opens a PDF blob in a new tab; Download saves a separate copy.
Browser PDF preferences can still choose an external viewer or download behavior.

## Required setup before release

Run database/setup-client-documents.sql once against project pqggobwpazihraeqvspc.
It creates the private client-documents bucket and membership-based read/upload
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
