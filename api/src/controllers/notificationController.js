const notifications = require('../services/notificationService');
const { pagination } = require('../utils/query');

async function list(req, res) { res.json(await notifications.list(req.user.id, req.query, pagination(req.query))); }
async function summary(req, res) { res.json(await notifications.summary(req.user.id, req.query.dias ?? 7)); }
async function read(req, res) { res.json(await notifications.markRead(req.user.id, req.params.id)); }
async function unread(req, res) { res.json(await notifications.markUnread(req.user.id, req.params.id)); }
async function readAll(req, res) { res.json(await notifications.markAllRead(req.user.id, req.query.dias ?? 7)); }

module.exports = { list, summary, read, unread, readAll };
