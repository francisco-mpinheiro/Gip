const express = require('express');
const { authenticate } = require('../middleware/auth');
const controller = require('../controllers/projectToolsController');
const router = express.Router();

router.get('/projects/:id/tools', authenticate, controller.getTools);
router.post('/projects/:id/issues', authenticate, controller.createIssue);
router.patch('/projects/:id/issues/:itemId', authenticate, controller.resolveIssue);
router.post('/projects/:id/dependencies', authenticate, controller.createDependency);
router.delete('/projects/:id/dependencies/:itemId', authenticate, controller.deleteDependency);
router.post('/projects/:id/reviews', authenticate, controller.submitReview);
router.patch('/projects/:id/reviews/:itemId', authenticate, controller.decideReview);
router.post('/projects/:id/check-ins', authenticate, controller.saveCheckIn);
router.post('/projects/:id/notes', authenticate, controller.createNote);
router.post('/projects/:id/department-requests', authenticate, controller.createDepartmentRequest);
router.patch('/projects/:id/department-requests/:itemId', authenticate, controller.resolveDepartmentRequest);
router.get('/department-requests', authenticate, controller.getDepartmentRequests);
router.post('/projects/:id/simulate', authenticate, controller.simulate);

module.exports = router;
