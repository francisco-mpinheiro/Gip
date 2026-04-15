const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const usersCtrl = require('../controllers/usersController');
const projectsCtrl = require('../controllers/projectsController');
const tasksCtrl = require('../controllers/tasksController');
const dashboardCtrl = require('../controllers/dashboardController');
const { ROLES } = require('../config/database');

const ADMIN_ROLES = [ROLES.ADMIN_PLATFORM, ROLES.ADMIN_COMPANY];
const MANAGER_ROLES = [ROLES.ADMIN_PLATFORM, ROLES.ADMIN_COMPANY, ROLES.MANAGER_AREA, ROLES.PROJECT_MANAGER];

// ─── AUTH ────────────────────────────────────────────────────────────────────
router.post('/auth/login', authCtrl.login);
router.post('/auth/register', authCtrl.register);
router.get('/auth/me', authenticate, authCtrl.me);

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

// ─── TASKS ───────────────────────────────────────────────────────────────────
router.get('/tasks', authenticate, tasksCtrl.getAll);
router.get('/tasks/:id', authenticate, tasksCtrl.getById);
router.post('/tasks', authenticate, authorize(...MANAGER_ROLES), tasksCtrl.create);
router.put('/tasks/:id', authenticate, tasksCtrl.update);
router.patch('/tasks/:id/status', authenticate, tasksCtrl.updateStatus);
router.delete('/tasks/:id', authenticate, authorize(...MANAGER_ROLES), tasksCtrl.delete);

// ─── DASHBOARD & PERFORMANCE ─────────────────────────────────────────────────
router.get('/dashboard', authenticate, dashboardCtrl.getDashboard);
router.get('/performance', authenticate, dashboardCtrl.getPerformance);

module.exports = router;
