// Access checks for staff pages.

const wantsJson = (req) => req.xhr || (req.headers.accept || '').includes('json');

// Any signed-in staff account (admin, staff or teacher).
function requireStaff(req, res, next) {
  if (req.session && req.session.user) return next();
  if (wantsJson(req)) return res.status(401).json({ success: false, message: 'Please sign in.' });
  return res.redirect('/login');
}

// Administrators only.
function requireAdmin(req, res, next) {
  const user = req.session && req.session.user;
  if (user && user.role === 'admin') return next();
  if (wantsJson(req)) return res.status(user ? 403 : 401).json({ success: false, message: 'Administrators only.' });
  if (!user) return res.redirect('/login');
  req.flash('error', 'Only administrators can do that.');
  return res.redirect(user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
}

const isAdmin = (req) => Boolean(req.session && req.session.user && req.session.user.role === 'admin');

module.exports = { requireStaff, requireAdmin, isAdmin };
