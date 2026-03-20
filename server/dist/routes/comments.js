"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const commentController_1 = require("../controllers/commentController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/', commentController_1.createComment);
router.get('/', commentController_1.getComments);
router.delete('/:id', commentController_1.deleteComment);
router.get('/users/search', commentController_1.searchUsers);
exports.default = router;
//# sourceMappingURL=comments.js.map