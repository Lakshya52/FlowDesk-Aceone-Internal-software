"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fileController_1 = require("../controllers/fileController");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../middlewares/upload");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/', upload_1.upload.single('file'), fileController_1.uploadFile);
router.get('/', fileController_1.getFiles);
router.get('/:id/download', fileController_1.downloadFile);
router.delete('/:id', fileController_1.deleteFile);
exports.default = router;
//# sourceMappingURL=files.js.map