import { saveRequestDataToDatabase } from "../services/logging"

function requestLog (req, res, next) {
  const method = req.method;
  const endpoint = req.originalUrl;
  const ip = req.ip === "::1" ? "127.0.0.1" : req.ip;
  const payload = method === 'GET' ? req.query : req.body;
  const host = req.get('host');
  const user_agent = req.get('user-agent');

    const info = {
      method,
      endpoint,
      ip,
      payload,
      host,
      user_agent,
    };
    saveRequestDataToDatabase(info);
    next();
};

export {
    requestLog
}
