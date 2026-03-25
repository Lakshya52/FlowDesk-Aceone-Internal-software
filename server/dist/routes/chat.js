"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../middlewares/upload");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/', upload_1.upload.single('file'), chatController_1.sendMessage);
router.get('/', chatController_1.getMessages);
router.delete('/:id', chatController_1.deleteMessage);
exports.default = router;
//# sourceMappingURL=chat.js.map