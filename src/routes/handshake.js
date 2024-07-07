import express from 'express';
var router = express.Router();
import { uuid } from 'uuidv4';

/* GET Session Handshake */
router.get('/', async (req, res, next) => {
  const sessionID = uuid();
  res.status(200).json({ session_id: sessionID });
});

export default router;
