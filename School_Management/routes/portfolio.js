const express = require('express');
const router = express.Router();

// Home page (portfolio landing)
router.get('/', (req, res) => {
  res.render('portfolio/home', { currentPage: 'home' });
});

// About page
router.get('/portfolio/about', (req, res) => {
  res.render('portfolio/about', { currentPage: 'about' });
});

// Academics page
router.get('/portfolio/academics', (req, res) => {
  res.render('portfolio/academics', { currentPage: 'academics' });
});

// Admissions page
router.get('/portfolio/admissions', (req, res) => {
  res.render('portfolio/admissions', { currentPage: 'admissions' });
});

// Contact page (GET)
router.get('/portfolio/contact', (req, res) => {
  res.render('portfolio/contact', { currentPage: 'contact' });
});

// Contact form submission (POST)
router.post('/portfolio/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  
  // Here you can add email sending logic or save to database
  console.log('Contact form submission:', { name, email, phone, subject, message });
  
  // For now, just redirect back with success message
  req.flash('success', 'Thank you for contacting us! We will get back to you soon.');
  res.redirect('/portfolio/contact');
});

// Program Pages
router.get('/portfolio/programs/primary', (req, res) => {
  res.render('portfolio/programs/primary', { currentPage: 'programs' });
});

router.get('/portfolio/programs/middle', (req, res) => {
  res.render('portfolio/programs/middle', { currentPage: 'programs' });
});

router.get('/portfolio/programs/high', (req, res) => {
  res.render('portfolio/programs/high', { currentPage: 'programs' });
});

router.get('/portfolio/programs/stem', (req, res) => {
  res.render('portfolio/programs/stem', { currentPage: 'programs' });
});

router.get('/portfolio/programs/sports', (req, res) => {
  res.render('portfolio/programs/sports', { currentPage: 'programs' });
});

router.get('/portfolio/programs/arts', (req, res) => {
  res.render('portfolio/programs/arts', { currentPage: 'programs' });
});

// Legal Pages
router.get('/portfolio/privacy-policy', (req, res) => {
  res.render('portfolio/privacy-policy', { currentPage: 'privacy' });
});

router.get('/portfolio/terms-of-service', (req, res) => {
  res.render('portfolio/terms-of-service', { currentPage: 'terms' });
});

router.get('/portfolio/sitemap', (req, res) => {
  res.render('portfolio/sitemap', { currentPage: 'sitemap' });
});

module.exports = router;
