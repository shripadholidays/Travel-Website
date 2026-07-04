const express = require('express');
const { createInquiry } = require('../controllers/InquiryController');

const router = express.Router();

router.post('/', createInquiry);

module.exports = router;
