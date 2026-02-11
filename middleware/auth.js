function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication required' 
    });
  }

  res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
}

function isAuthenticated(req, res, next) {
  res.locals.isAuthenticated = !!(req.session && req.session.userId);
  res.locals.user = req.session ? req.session.user : null;
  next();
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  next();
}

module.exports = {
  requireAuth,
  isAuthenticated,
  redirectIfAuthenticated
};
