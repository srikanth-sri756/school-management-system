// Documents the school office keeps for students and teachers.
// Files are uploaded by administrators and stored privately in storage/documents.

const STUDENT_DOCUMENTS = [
  {
    key: 'aadhaar',
    label: 'Aadhaar card',
    hint: 'A masked Aadhaar (only the last 4 digits visible) is recommended.',
    required: () => true
  },
  {
    key: 'transfer_certificate',
    label: 'Transfer certificate',
    hint: 'Issued by the previous school.',
    required: (student) => Boolean(student && student.isTransfer),
    transferOnly: true
  },
  { key: 'birth_certificate', label: 'Birth certificate', required: () => false },
  {
    key: 'previous_records',
    label: 'Previous school records',
    hint: 'Latest report card or marks memo.',
    required: () => false,
    transferOnly: true
  }
];

const TEACHER_DOCUMENTS = [
  {
    key: 'aadhaar',
    label: 'Aadhaar card',
    hint: 'A masked Aadhaar (only the last 4 digits visible) is recommended.',
    required: () => true
  },
  { key: 'pan', label: 'PAN card', required: () => true },
  {
    key: 'bank_proof',
    label: 'Bank proof',
    hint: 'Cancelled cheque or the first page of the passbook.',
    required: () => false
  }
];

const BANK_FIELDS = ['accountHolder', 'bankName', 'accountNumber', 'ifsc'];

const documentTypes = (kind) => (kind === 'teacher' ? TEACHER_DOCUMENTS : STUDENT_DOCUMENTS);

const findDocument = (person, key) => ((person && person.documents) || []).find((d) => d.type === key);

// One row per document type: { key, label, hint, required, doc, status: 'on-file' | 'missing' | 'optional' }.
// Transfer-only types are left out for students joining fresh, unless one is on file.
function documentChecklist(kind, person) {
  return documentTypes(kind)
    .map((type) => ({ type, doc: findDocument(person, type.key) }))
    .filter(({ type, doc }) => !type.transferOnly || (person && person.isTransfer) || doc)
    .map(({ type, doc }) => {
      const required = type.required(person);
      return { ...type, required, doc, status: doc ? 'on-file' : required ? 'missing' : 'optional' };
    });
}

const hasBankDetails = (teacher) => Boolean(teacher && teacher.bankDetails
  && BANK_FIELDS.every((field) => String(teacher.bankDetails[field] || '').trim()));

// Labels of everything still required but missing, e.g. ['Aadhaar card', 'Bank details']
function missingDocuments(kind, person) {
  const missing = documentChecklist(kind, person).filter((row) => row.status === 'missing').map((row) => row.label);
  if (kind === 'teacher' && !hasBankDetails(person)) missing.push('Bank details');
  return missing;
}

// Applies a submitted form to a person's document list:
//   files['doc_<key>'] (from multer) adds or replaces the document of that type;
//   removeKeys (form field "removeDoc", one key or a list) removes documents.
// Returns the new list and the stored files that are no longer needed, which the
// caller deletes once the record has been saved.
function mergeDocuments(kind, current, files, removeKeys, uploadedBy) {
  const remove = new Set([].concat(removeKeys || []));
  const known = new Set(documentTypes(kind).map((type) => type.key));
  const plain = (doc) => (doc && typeof doc.toObject === 'function' ? doc.toObject() : doc);
  const documents = (current || []).filter((doc) => !known.has(doc.type)).map(plain);
  const obsoleteFiles = [];

  documentTypes(kind).forEach(({ key }) => {
    const upload = files && files[`doc_${key}`] && files[`doc_${key}`][0];
    const existing = findDocument({ documents: current }, key);
    if (upload) {
      documents.push({
        type: key,
        filename: upload.filename,
        originalName: String(upload.originalname || '').slice(0, 200),
        mimeType: upload.mimetype,
        size: upload.size,
        uploadedBy,
        uploadedAt: new Date()
      });
      if (existing) obsoleteFiles.push(existing.filename);
    } else if (existing && !remove.has(key)) {
      documents.push(plain(existing));
    } else if (existing) {
      obsoleteFiles.push(existing.filename);
    }
  });
  return { documents, obsoleteFiles };
}

// Bank details from a submitted form, plus a list of problems (empty when valid).
// With required = false an entirely empty set is accepted.
function readBankDetails(body, required) {
  const clean = (value) => String(value || '').trim();
  const details = {
    accountHolder: clean(body.accountHolder),
    bankName: clean(body.bankName),
    accountNumber: clean(body.accountNumber).replace(/[\s-]/g, ''),
    ifsc: clean(body.ifsc).toUpperCase(),
    branch: clean(body.branch)
  };
  const errors = [];
  const anyGiven = Object.values(details).some(Boolean);
  if (required || anyGiven) {
    if (!details.accountHolder) errors.push('Enter the account holder name.');
    if (!details.bankName) errors.push('Enter the bank name.');
    if (!/^\d{9,18}$/.test(details.accountNumber)) errors.push('The account number must be 9 to 18 digits.');
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(details.ifsc)) errors.push('The IFSC code should look like SBIN0001234.');
  }
  return { details, errors };
}

// "Aadhaar card, PAN card and bank proof": document labels for use inside a sentence
const listLabels = (labels) => {
  const words = labels.map((label) => (/^(Aadhaar|PAN)/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1)));
  return words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : words[0] || '';
};

// ••••1234
const maskAccount = (number) => {
  const digits = String(number || '').replace(/\s+/g, '');
  return digits ? `•••• ${digits.slice(-4)}` : '';
};

module.exports = {
  STUDENT_DOCUMENTS,
  TEACHER_DOCUMENTS,
  BANK_FIELDS,
  documentTypes,
  findDocument,
  documentChecklist,
  mergeDocuments,
  readBankDetails,
  missingDocuments,
  listLabels,
  hasBankDetails,
  maskAccount
};
