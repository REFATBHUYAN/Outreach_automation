import { Router } from 'express';
import multer from 'multer';
import * as chat from '../controllers/chat.controller';
import * as jobs from '../controllers/jobs.controller';
import * as candidates from '../controllers/candidates.controller';
import * as campaigns from '../controllers/campaigns.controller';
import { stream } from '../controllers/events.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
export const router = Router();

router.get('/events', stream);

router.get('/messages', chat.listMessages);
router.post('/chat', chat.sendChat);
router.post('/messages/clear', chat.clearChat);
router.post('/messages/:id/action', chat.cardAction);

router.get('/jobs', jobs.listJobs);
router.post('/jobs', jobs.createJob);
router.get('/jobs/:id', jobs.getJob);
router.patch('/jobs/:id', jobs.updateJob);
router.get('/jobs/:id/candidates', jobs.listCandidates);
router.post('/jobs/:id/candidates/csv', upload.single('file'), jobs.uploadCsv);
router.get('/jobs/:id/activity', jobs.listActivity);
router.get('/jobs/:id/campaigns', jobs.listCampaigns);
router.get('/jobs/:id/summary', jobs.summary);
router.post('/jobs/:id/queries', jobs.createQueries);
router.post('/jobs/:id/source', jobs.source);
router.post('/jobs/:id/score', jobs.scoreUnscored);
router.get('/jobs/:id/sourcing', jobs.latestSourcing);

router.patch('/candidates/:id/status', candidates.updateStatus);
router.post('/candidates/:id/reply', candidates.approveReply);
router.get('/candidates/:id/booking', candidates.getBooking);
router.post('/candidates/:id/book', candidates.book);
router.post('/simulate-reply', candidates.simulateReply);

router.get('/campaigns/:id', campaigns.getCampaign);
router.put('/campaigns/:id/drafts', campaigns.saveDrafts);
router.post('/campaigns/:id/pause', campaigns.pause);
router.post('/campaigns/:id/resume', campaigns.resume);
