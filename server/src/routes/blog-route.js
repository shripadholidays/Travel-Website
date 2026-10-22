const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const authorize = require('../middlewares/authorize');
const canWriteArticle = require('../middlewares/can-write-article');
const {
    getPosts, getPostBySlug,
    createPost, updatePost, deletePost
} = require('../controllers/BlogController');

const router = express.Router();

router.get('/', getPosts);
router.get('/:slug', getPostBySlug);

router.post('/', isLoggedIn, authorize('user', 'moderator', 'admin'), canWriteArticle, createPost);
router.put('/:id', isLoggedIn, authorize('admin', 'moderator'), updatePost);
router.delete('/:id', isLoggedIn, authorize('admin'), deletePost);

module.exports = router;
