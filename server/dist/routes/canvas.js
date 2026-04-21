"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const canvasController_1 = require("../controllers/canvasController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate); // All canvas routes require authentication
router.get('/', canvasController_1.getNotes);
router.post('/', canvasController_1.createNote);
router.put('/:id', canvasController_1.updateNote);
router.delete('/:id', canvasController_1.deleteNote);
exports.default = router;
//# sourceMappingURL=canvas.js.map