"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const conversationController_1 = require("../controllers/conversationController");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../middlewares/upload");
const router = (0, express_1.Router)();
// Apply auth middleware to all conversation routes
router.use(auth_1.authenticate);
router.get('/', conversationController_1.getConversations);
router.post('/', conversationController_1.createConversation);
router.delete('/:id', conversationController_1.deleteConversation);
router.get('/:id/messages', conversationController_1.getMessages);
router.post('/:id/messages', upload_1.upload.single('file'), conversationController_1.sendMessage);
router.post('/messages/:messageId/react', conversationController_1.toggleReaction);
router.post('/messages/:messageId/forward', conversationController_1.forwardMessage);
router.put('/messages/:messageId', conversationController_1.editMessage);
router.delete('/messages/:messageId', conversationController_1.deleteMessage);
exports.default = router;
//# sourceMappingURL=conversations.js.map