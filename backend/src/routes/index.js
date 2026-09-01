const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const usersCtrl = require('../controllers/usersController');
const projectsCtrl = require('../controllers/projectsController');
const tasksCtrl = require('../controllers/tasksController');
const dashboardCtrl = require('../controllers/dashboardController');
const notificationsCtrl = require('../controllers/notificationsController');
const { ROLES } = require('../config/database');

const ADMIN_ROLES = [ROLES.ADMIN_PLATFORM, ROLES.ADMIN_COMPANY];
const MANAGER_ROLES = [ROLES.ADMIN_PLATFORM, ROLES.ADMIN_COMPANY, ROLES.MANAGER_AREA, ROLES.PROJECT_MANAGER];

// ─── AUTH ────────────────────────────────────────────────────────────────────
router.post('/auth/login', authCtrl.login);
router.post('/auth/register', authCtrl.register);
router.get('/auth/me', authenticate, authCtrl.me);
router.post('/auth/forgot-password', authCtrl.forgotPassword);
router.post('/auth/reset-password', authCtrl.resetPassword);

// ─── USERS ───────────────────────────────────────────────────────────────────
router.get('/users', authenticate, usersCtrl.getAll);
router.get('/users/:id', authenticate, usersCtrl.getById);
router.post('/users', authenticate, authorize(...ADMIN_ROLES), usersCtrl.create);
router.put('/users/:id', authenticate, authorize(...ADMIN_ROLES), usersCtrl.update);
router.patch('/users/:id/toggle', authenticate, authorize(...ADMIN_ROLES), usersCtrl.toggleActive);
router.delete('/users/:id', authenticate, authorize(ROLES.ADMIN_PLATFORM), usersCtrl.delete);

// ─── PROJECTS ────────────────────────────────────────────────────────────────
router.get('/projects', authenticate, projectsCtrl.getAll);
router.get('/projects/:id', authenticate, projectsCtrl.getById);
router.post('/projects', authenticate, authorize(...MANAGER_ROLES), projectsCtrl.create);
router.put('/projects/:id', authenticate, projectsCtrl.update);
router.delete('/projects/:id', authenticate, authorize(...ADMIN_ROLES), projectsCtrl.delete);

const upload = require('../middleware/upload');
const profileCtrl = require('../controllers/profileController');
const educationCtrl = require('../controllers/educationController');

// ─── TASKS ───────────────────────────────────────────────────────────────────
router.get('/tasks', authenticate, tasksCtrl.getAll);
router.get('/tasks/:id', authenticate, tasksCtrl.getById);
router.post('/tasks', authenticate, authorize(...MANAGER_ROLES), tasksCtrl.create);
router.put('/tasks/:id', authenticate, tasksCtrl.update);
router.patch('/tasks/:id/status', authenticate, tasksCtrl.updateStatus);
router.delete('/tasks/:id', authenticate, authorize(...MANAGER_ROLES), tasksCtrl.delete);
router.get('/tasks/:id/comments', authenticate, tasksCtrl.getComments);
router.post('/tasks/:id/comments', authenticate, tasksCtrl.addComment);
router.post('/tasks/:id/attachments', authenticate, upload.single('file'), tasksCtrl.addAttachment);
router.delete('/tasks/:id/attachments/:attachmentId', authenticate, tasksCtrl.deleteAttachment);

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
router.get('/notifications', authenticate, notificationsCtrl.getAll);
router.patch('/notifications/read-all', authenticate, notificationsCtrl.markAllAsRead);
router.patch('/notifications/:id/read', authenticate, notificationsCtrl.markAsRead);

// ─── DASHBOARD & PERFORMANCE ─────────────────────────────────────────────────
router.get('/dashboard', authenticate, dashboardCtrl.getDashboard);
router.get('/performance', authenticate, dashboardCtrl.getPerformance);

// ─── CHAT ────────────────────────────────────────────────────────────────────
const chatCtrl = require('../controllers/chatController');
router.get('/chat/:userId', authenticate, chatCtrl.getHistory);

// ─── PROFILE (usuário autenticado) ───────────────────────────────────────────
router.get('/user/profile', authenticate, profileCtrl.getProfile);
router.put('/user/profile', authenticate, profileCtrl.updateProfile);
router.post('/user/change-password', authenticate, profileCtrl.changePassword);

// ─── EDUCAÇÕES / FORMAÇÕES ───────────────────────────────────────────────────
// Listagens e CRUD apenas para usuário logado
router.get('/user/education', authenticate, educationCtrl.list);
router.post('/user/education', authenticate,
	upload.create({
		limits: { fileSize: 5 * 1024 * 1024 },
		fileFilter: (req, file, cb) => {
			const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
			cb(null, allowed.includes(file.mimetype));
		}
	}).single('certificate'),
	educationCtrl.create
);
router.delete('/user/education/:id', authenticate, educationCtrl.remove);

module.exports = router;
