const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const optionalAuth = require('../middlewares/optional-auth');
const canWriteArticle = require('../middlewares/can-write-article');
const {
    getPosts, getMyPosts, getPostBySlug,
    createPost, updatePost, deletePost
} = require('../controllers/BlogController');

const router = express.Router();

// Signed-in staff see every status; everyone else sees published articles only
router.get('/', optionalAuth, getPosts);
router.get('/mine', isLoggedIn, getMyPosts);
router.get('/:slug', optionalAuth, getPostBySlug);

router.post('/', isLoggedIn, canWriteArticle, createPost);
// Ownership and who may publish are checked in the controller
router.put('/:id', isLoggedIn, updatePost);
router.delete('/:id', isLoggedIn, deletePost);

module.exports = router;
