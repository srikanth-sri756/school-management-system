// Photography used on the public website.
//
// These are placeholder photos from Unsplash (free to use under the Unsplash License,
// https://unsplash.com/license), served from Unsplash's image CDN.
// To use one of your own photos instead, copy it into public/images/ and replace the
// entry with a `src`, for example:
//   'home-hero': { src: '/images/campus.jpg', alt: 'The main school building' },
const PHOTOS = {
  'home-hero': { id: '1505488387362-48bc38155987', alt: 'A long library hall lined with books' },
  'campus-dusk': { id: '1763770449161-eb1cd5596415', alt: 'A stone school building with lit windows at dusk' },
  'hallway': { id: '1713067296265-a0bb39a8016b', alt: 'A quiet corridor with light falling across the floor' },
  'guidance': { id: '1583468982228-19f19164aee2', alt: 'A teacher reading a book with a young student in the library' },
  'classroom-light': { id: '1757192420362-3629ce30d2e3', alt: 'An empty classroom with sunlight across the desks' },
  'library-warm': { id: '1728506972831-193841eb2961', alt: 'A library room with shelves of books and a chandelier' },
  'blackboard': { id: '1758685733699-04d6544f2655', alt: 'A student standing before a blackboard covered in equations' },
  'campus-sky': { id: '1763770448006-1f641339f28a', alt: 'A school building under an evening sky' },
  'bookshelf-light': { id: '1761834520785-ca17a0275f6d', alt: 'Sunlight falling across a bookshelf' },
  'library-rows': { id: '1502485019198-a625bd53ceb7', alt: 'Rows of bookshelves in a library' },
  'library-ladder': { id: '1697791173189-d56b15df4f33', alt: 'A ladder resting against tall bookshelves' },
  'program-primary': { id: '1532789339108-2ebc484efbf1', alt: 'Two young children reading a book together' },
  'program-middle': { id: '1635424239131-32dc44986b56', alt: 'A classroom with wooden desks and tall windows' },
  'program-high': { id: '1758685848697-b5fb55f87407', alt: 'A hand writing mathematical formulas on a blackboard' },
  'program-stem': { id: '1572884267966-02340ebc90ac', alt: 'A microscope in a science laboratory' },
  'program-sports': { id: '1728908053186-54a888346f82', alt: 'A running track under floodlights at night' },
  'program-arts': { id: '1619006754087-42fedf8f0364', alt: 'Paint brushes in a bucket in an art studio' }
};

const escapeAttr = (value) => String(value).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// <img> for a photo key, e.g. <%- photo('home-hero', { eager: true, decorative: true }) %>
function photo(key, { className = '', sizes = '100vw', eager = false, decorative = false } = {}) {
  const entry = PHOTOS[key];
  if (!entry) return '';
  const alt = decorative ? '' : escapeAttr(entry.alt);
  const loading = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  const cls = className ? ` class="${escapeAttr(className)}"` : '';
  if (entry.src) {
    return `<img${cls} src="${escapeAttr(entry.src)}" alt="${alt}" ${loading} decoding="async">`;
  }
  const url = (w) => `https://images.unsplash.com/photo-${entry.id}?auto=format&fit=crop&w=${w}&q=70`;
  const srcset = [640, 1080, 1600, 2400].map((w) => `${url(w)} ${w}w`).join(', ');
  return `<img${cls} src="${url(1600)}" srcset="${srcset}" sizes="${escapeAttr(sizes)}" alt="${alt}" ${loading} decoding="async">`;
}

module.exports = { PHOTOS, photo };
