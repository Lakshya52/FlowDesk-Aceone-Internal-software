"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const teamController_1 = require("../controllers/teamController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/', (0, auth_1.authorize)('admin'), teamController_1.createTeam);
router.get('/', teamController_1.getTeams);
router.get('/:id', teamController_1.getTeam);
router.put('/:id', (0, auth_1.authorize)('admin', 'manager'), teamController_1.updateTeam);
router.delete('/:id', (0, auth_1.authorize)('admin'), teamController_1.deleteTeam);
router.put('/:id/members', (0, auth_1.authorize)('admin', 'manager'), teamController_1.updateTeamMembers);
router.post('/:id/request-join', teamController_1.requestJoinTeam);
router.post('/:id/requests/:userId/approve', (0, auth_1.authorize)('admin', 'manager'), teamController_1.approveJoinRequest);
router.post('/:id/requests/:userId/reject', (0, auth_1.authorize)('admin', 'manager'), teamController_1.rejectJoinRequest);
exports.default = router;
//# sourceMappingURL=teams.js.map